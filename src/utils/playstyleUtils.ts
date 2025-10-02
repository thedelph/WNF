import { PREDEFINED_PLAYSTYLES } from '../data/playstyles';

// Player averaged attributes from database
export interface PlayerAveragedAttributes {
  pace_rating: number;
  shooting_rating: number;
  passing_rating: number;
  dribbling_rating: number;
  defending_rating: number;
  physical_rating: number;
}

// Playstyle match result
export interface PlaystyleMatch {
  playstyleName: string;
  category: 'attacking' | 'midfield' | 'defensive';
  matchDistance: number;
  matchQuality: 'perfect' | 'excellent' | 'good' | 'moderate' | 'weak';
  colorClass: string;
  bgColorClass: string;
}

// All 63 predefined playstyles with their attributes
interface PlaystyleDefinition {
  name: string;
  category: 'attacking' | 'midfield' | 'defensive';
  has_pace: boolean;
  has_shooting: boolean;
  has_passing: boolean;
  has_dribbling: boolean;
  has_defending: boolean;
  has_physical: boolean;
}

/**
 * Calculate Manhattan distance between player attributes and a playstyle
 */
function calculateDistance(
  playerAttrs: PlayerAveragedAttributes,
  playstyle: PlaystyleDefinition
): number {
  const distance =
    Math.abs((playstyle.has_pace ? 1.0 : 0) - (playerAttrs.pace_rating || 0)) +
    Math.abs((playstyle.has_shooting ? 1.0 : 0) - (playerAttrs.shooting_rating || 0)) +
    Math.abs((playstyle.has_passing ? 1.0 : 0) - (playerAttrs.passing_rating || 0)) +
    Math.abs((playstyle.has_dribbling ? 1.0 : 0) - (playerAttrs.dribbling_rating || 0)) +
    Math.abs((playstyle.has_defending ? 1.0 : 0) - (playerAttrs.defending_rating || 0)) +
    Math.abs((playstyle.has_physical ? 1.0 : 0) - (playerAttrs.physical_rating || 0));

  return distance;
}

/**
 * Get match quality and color based on distance
 */
function getMatchQuality(distance: number): {
  quality: 'perfect' | 'excellent' | 'good' | 'moderate' | 'weak';
  colorClass: string;
  bgColorClass: string;
} {
  if (distance <= 0.33) {
    return {
      quality: 'perfect',
      colorClass: 'text-green-400',
      bgColorClass: 'badge-success'
    };
  } else if (distance <= 0.80) {
    return {
      quality: 'excellent',
      colorClass: 'text-green-500',
      bgColorClass: 'bg-green-500/20 text-green-400'
    };
  } else if (distance <= 1.25) {
    return {
      quality: 'good',
      colorClass: 'text-yellow-400',
      bgColorClass: 'bg-yellow-500/20 text-yellow-400'
    };
  } else if (distance <= 1.75) {
    return {
      quality: 'moderate',
      colorClass: 'text-orange-400',
      bgColorClass: 'bg-orange-500/20 text-orange-400'
    };
  } else {
    return {
      quality: 'weak',
      colorClass: 'text-red-400',
      bgColorClass: 'bg-red-500/20 text-red-400'
    };
  }
}

/**
 * Find the closest matching playstyle for a player's averaged attributes
 */
export function findClosestPlaystyle(
  playerAttrs: PlayerAveragedAttributes | null,
  playstyles: PlaystyleDefinition[]
): PlaystyleMatch | null {
  if (!playerAttrs || !playstyles.length) {
    console.log('🎯 findClosestPlaystyle - Early return:', {
      hasPlayerAttrs: !!playerAttrs,
      playstyleCount: playstyles.length
    });
    return null;
  }

  // Calculate distance to each playstyle
  const distances = playstyles.map(playstyle => ({
    playstyle,
    distance: calculateDistance(playerAttrs, playstyle)
  }));

  // Sort by distance (ascending) and get the closest
  distances.sort((a, b) => {
    // Primary sort by distance
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    // Secondary sort by number of attributes (prefer more specific when tied)
    const aCount = [
      a.playstyle.has_pace,
      a.playstyle.has_shooting,
      a.playstyle.has_passing,
      a.playstyle.has_dribbling,
      a.playstyle.has_defending,
      a.playstyle.has_physical
    ].filter(Boolean).length;

    const bCount = [
      b.playstyle.has_pace,
      b.playstyle.has_shooting,
      b.playstyle.has_passing,
      b.playstyle.has_dribbling,
      b.playstyle.has_defending,
      b.playstyle.has_physical
    ].filter(Boolean).length;

    return bCount - aCount; // Prefer more attributes when distance is same
  });

  const closest = distances[0];
  const matchQualityData = getMatchQuality(closest.distance);

  return {
    playstyleName: closest.playstyle.name,
    category: closest.playstyle.category,
    matchDistance: closest.distance,
    matchQuality: matchQualityData.quality,
    colorClass: matchQualityData.colorClass,
    bgColorClass: matchQualityData.bgColorClass
  };
}

/**
 * Format match distance for display
 */
export function formatMatchDistance(distance: number): string {
  return distance.toFixed(2);
}

/**
 * Get match quality percentage (inverse of distance)
 * Perfect match (0.0) = 100%, Max distance (6.0) = 0%
 */
export function getMatchPercentage(distance: number): number {
  const maxDistance = 6.0;
  const percentage = ((maxDistance - Math.min(distance, maxDistance)) / maxDistance) * 100;
  return Math.round(percentage);
}