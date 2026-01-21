import type { BruteForcePlayer, ChemistryPair, ChemistryMap } from '../types';
import { getChemistryPairKey } from './loadChemistry';

/**
 * Estimated chemistry result with confidence score
 */
export interface EstimatedChemistry {
  score: number;
  confidence: number;
  isEstimate: true;
}

/**
 * Statistics about chemistry estimation
 */
export interface ChemistryEstimationStats {
  realPairs: number;
  estimatedPairs: number;
  avgConfidence: number;
}

/**
 * Calculate Euclidean similarity between two players based on their attributes.
 * Higher similarity = players have similar playstyles.
 *
 * @param p1 - First player
 * @param p2 - Second player
 * @returns Similarity score from 0 to 1
 */
function calculateAttributeSimilarity(
  p1: BruteForcePlayer,
  p2: BruteForcePlayer
): number {
  const { pace: pace1, shooting: shoot1, passing: pass1, dribbling: drib1, defending: def1, physical: phys1 } =
    p1.attributes;
  const { pace: pace2, shooting: shoot2, passing: pass2, dribbling: drib2, defending: def2, physical: phys2 } =
    p2.attributes;

  // Euclidean distance on 6 attributes (each 0-1)
  const attrDist = Math.sqrt(
    Math.pow(pace1 - pace2, 2) +
      Math.pow(shoot1 - shoot2, 2) +
      Math.pow(pass1 - pass2, 2) +
      Math.pow(drib1 - drib2, 2) +
      Math.pow(def1 - def2, 2) +
      Math.pow(phys1 - phys2, 2)
  );

  // Max possible distance (all 0 vs all 1)
  const maxDist = Math.sqrt(6);

  // Convert to similarity: 0 = completely different, 1 = identical
  return 1 - attrDist / maxDist;
}

/**
 * Calculate complementary score based on position diversity.
 * Players in different roles may work well together.
 *
 * @param p1 - First player
 * @param p2 - Second player
 * @returns Complementary score from 0 to 1
 */
function calculatePositionComplementarity(
  p1: BruteForcePlayer,
  p2: BruteForcePlayer
): number {
  // If both have positions, check if they're different (complementary)
  if (p1.primaryPosition && p2.primaryPosition) {
    if (p1.primaryPosition !== p2.primaryPosition) {
      return 0.6; // Different positions = potentially complementary
    }
    return 0.4; // Same position = potential competition
  }
  // No position data available
  return 0.5; // Neutral
}

/**
 * Estimate chemistry score for players without game history.
 *
 * Uses a conservative approach:
 * - Base score of 50 (neutral)
 * - Adjusted +/- 10 based on attribute similarity
 * - Confidence based on available data
 *
 * @param p1 - First player
 * @param p2 - Second player
 * @returns Estimated chemistry with confidence score
 */
export function estimateChemistryScore(
  p1: BruteForcePlayer,
  p2: BruteForcePlayer
): EstimatedChemistry {
  // Check if we have meaningful attribute data
  const hasP1Attrs = Object.values(p1.attributes).some((v) => v > 0);
  const hasP2Attrs = Object.values(p2.attributes).some((v) => v > 0);
  const hasAttributes = hasP1Attrs && hasP2Attrs;

  if (!hasAttributes) {
    // No attribute data - return neutral estimate with low confidence
    return {
      score: 50,
      confidence: 0.2,
      isEstimate: true,
    };
  }

  // Calculate similarity based on attributes
  const similarity = calculateAttributeSimilarity(p1, p2);

  // Get complementarity based on positions
  const complementarity = calculatePositionComplementarity(p1, p2);

  // Combine: similar attributes + complementary positions = good chemistry
  // Weight similarity more as it's based on actual playstyle data
  const combinedScore = similarity * 0.7 + complementarity * 0.3;

  // Conservative estimate: 50 +/- 10 based on combined score
  // combinedScore ranges from 0-1, we map it to -1 to +1 for adjustment
  const estimatedScore = 50 + (combinedScore - 0.5) * 20;

  // Confidence based on available data
  // Higher if both players have attributes, both have positions
  let confidence = 0.4; // Base confidence for estimates
  if (hasP1Attrs && hasP2Attrs) confidence += 0.2;
  if (p1.primaryPosition && p2.primaryPosition) confidence += 0.1;

  return {
    score: Math.max(40, Math.min(60, estimatedScore)),
    confidence: Math.min(0.7, confidence), // Cap at 0.7 (estimates never as confident as real data)
    isEstimate: true,
  };
}

/**
 * Augment chemistry map with estimates for missing pairs.
 *
 * For any pair of players that doesn't have real chemistry data,
 * this function adds an estimated chemistry score based on
 * player similarity and complementarity.
 *
 * @param chemistryMap - Existing chemistry data
 * @param players - All players to consider
 * @returns Augmented map with estimates and statistics
 */
export function augmentChemistryWithEstimates(
  chemistryMap: ChemistryMap,
  players: BruteForcePlayer[]
): {
  augmentedMap: ChemistryMap;
  stats: ChemistryEstimationStats;
} {
  // Create a new map starting with existing data
  const augmentedMap = new Map(chemistryMap);
  let estimatedCount = 0;
  let totalConfidence = 0;

  // Generate estimates for all missing pairs
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const key = getChemistryPairKey(players[i].player_id, players[j].player_id);

      if (!augmentedMap.has(key)) {
        const estimate = estimateChemistryScore(players[i], players[j]);

        // Add estimated pair to map
        // games_together = 0 indicates this is an estimate
        const estimatedPair: ChemistryPair = {
          player1_id: players[i].player_id,
          player2_id: players[j].player_id,
          chemistry_score: estimate.score,
          games_together: 0, // 0 indicates estimate
          wins_together: 0,
          losses_together: 0,
        };

        augmentedMap.set(key, estimatedPair);
        estimatedCount++;
        totalConfidence += estimate.confidence;
      }
    }
  }

  return {
    augmentedMap,
    stats: {
      realPairs: chemistryMap.size,
      estimatedPairs: estimatedCount,
      avgConfidence: estimatedCount > 0 ? totalConfidence / estimatedCount : 0,
    },
  };
}
