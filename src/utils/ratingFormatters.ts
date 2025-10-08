/**
 * Utility functions for formatting player ratings consistently across the application
 */

/**
 * Formats a numeric rating value for display
 * @param rating - The rating value (0-10 scale)
 * @param showUnrated - Whether to show "unrated" for null/undefined values
 * @returns Formatted string representation
 */
export const formatRating = (rating: number | null | undefined, showUnrated = true): string => {
  if (rating === null || rating === undefined) {
    return showUnrated ? 'unrated' : '0.0';
  }
  return rating.toFixed(1);
};

/**
 * Formats a rating as stars (converts from 0-10 to 0-5 scale)
 * @param rating - The rating value (0-10 scale)
 * @returns Formatted string with star count or "unrated"
 */
export const formatStarRating = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) {
    return 'unrated';
  }
  return `${rating / 2} stars`;
};

/**
 * Checks if a player has any missing ratings
 * @param ratings - Object containing attack, defense, game_iq, and gk ratings
 * @returns Object indicating which ratings are missing
 */
export const getMissingRatings = (ratings: {
  attack_rating?: number | null;
  defense_rating?: number | null;
  game_iq_rating?: number | null;
  gk_rating?: number | null;
}): {
  missingAttack: boolean;
  missingDefense: boolean;
  missingGameIq: boolean;
  missingGk: boolean;
  hasAnyRating: boolean;
  missingCount: number;
} => {
  const missingAttack = !ratings.attack_rating;
  const missingDefense = !ratings.defense_rating;
  const missingGameIq = !ratings.game_iq_rating;
  const missingGk = !ratings.gk_rating;
  const missingCount = [missingAttack, missingDefense, missingGameIq, missingGk].filter(Boolean).length;
  const hasAnyRating = !missingAttack || !missingDefense || !missingGameIq || !missingGk;

  return {
    missingAttack,
    missingDefense,
    missingGameIq,
    missingGk,
    hasAnyRating,
    missingCount
  };
};

/**
 * Determines the appropriate button text based on missing ratings
 * @param ratings - Object containing the current ratings
 * @returns Appropriate button text
 */
export const getRatingButtonText = (ratings: {
  attack_rating?: number | null;
  defense_rating?: number | null;
  game_iq_rating?: number | null;
  gk_rating?: number | null;
} | null | undefined): string => {
  if (!ratings) {
    return 'RATE PLAYER';
  }

  const missing = getMissingRatings(ratings);

  if (missing.missingCount === 4) {
    return 'RATE PLAYER';
  } else if (missing.missingCount === 1 && missing.missingGameIq) {
    return 'ADD GAME IQ RATING';
  } else if (missing.missingCount === 1 && missing.missingGk) {
    return 'ADD GK RATING';
  } else if (missing.missingCount > 0) {
    return 'COMPLETE RATING';
  } else {
    return 'UPDATE RATING';
  }
};