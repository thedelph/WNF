import { describe, it, expect } from 'vitest';
import {
  formatRating,
  formatStarRating,
  getMissingRatings,
  getRatingButtonText
} from '../ratingFormatters';

describe('formatRating', () => {
  it('formats a valid rating to 1 decimal place', () => {
    expect(formatRating(7.5)).toBe('7.5');
    expect(formatRating(10)).toBe('10.0');
    expect(formatRating(0)).toBe('0.0');
  });

  it('returns "unrated" for null/undefined by default', () => {
    expect(formatRating(null)).toBe('unrated');
    expect(formatRating(undefined)).toBe('unrated');
  });

  it('returns "0.0" for null/undefined when showUnrated is false', () => {
    expect(formatRating(null, false)).toBe('0.0');
    expect(formatRating(undefined, false)).toBe('0.0');
  });

  it('handles edge case fractional values', () => {
    expect(formatRating(3.14159)).toBe('3.1');
    expect(formatRating(9.99)).toBe('10.0');
    expect(formatRating(0.05)).toBe('0.1');
  });
});

describe('formatStarRating', () => {
  it('converts 0-10 scale to 0-5 stars', () => {
    expect(formatStarRating(10)).toBe('5 stars');
    expect(formatStarRating(8)).toBe('4 stars');
    expect(formatStarRating(0)).toBe('0 stars');
  });

  it('returns "unrated" for null/undefined', () => {
    expect(formatStarRating(null)).toBe('unrated');
    expect(formatStarRating(undefined)).toBe('unrated');
  });
});

describe('getMissingRatings', () => {
  it('identifies all ratings as missing when empty', () => {
    const result = getMissingRatings({});
    expect(result.missingCount).toBe(4);
    expect(result.hasAnyRating).toBe(false);
    expect(result.missingAttack).toBe(true);
    expect(result.missingDefense).toBe(true);
    expect(result.missingGameIq).toBe(true);
    expect(result.missingGk).toBe(true);
  });

  it('identifies no missing ratings when all provided', () => {
    const result = getMissingRatings({
      attack_rating: 7,
      defense_rating: 6,
      game_iq_rating: 8,
      gk_rating: 5
    });
    expect(result.missingCount).toBe(0);
    expect(result.hasAnyRating).toBe(true);
  });

  it('correctly identifies partially missing ratings', () => {
    const result = getMissingRatings({
      attack_rating: 7,
      defense_rating: null,
      game_iq_rating: 8,
      gk_rating: undefined
    });
    expect(result.missingCount).toBe(2);
    expect(result.missingAttack).toBe(false);
    expect(result.missingDefense).toBe(true);
    expect(result.missingGameIq).toBe(false);
    expect(result.missingGk).toBe(true);
    expect(result.hasAnyRating).toBe(true);
  });
});

describe('getRatingButtonText', () => {
  it('returns "RATE PLAYER" for null ratings', () => {
    expect(getRatingButtonText(null)).toBe('RATE PLAYER');
    expect(getRatingButtonText(undefined)).toBe('RATE PLAYER');
  });

  it('returns "RATE PLAYER" when all ratings are missing', () => {
    expect(getRatingButtonText({})).toBe('RATE PLAYER');
  });

  it('returns "UPDATE RATING" when all ratings are present', () => {
    expect(getRatingButtonText({
      attack_rating: 7,
      defense_rating: 6,
      game_iq_rating: 8,
      gk_rating: 5
    })).toBe('UPDATE RATING');
  });

  it('returns specific text when only game IQ is missing', () => {
    expect(getRatingButtonText({
      attack_rating: 7,
      defense_rating: 6,
      game_iq_rating: null,
      gk_rating: 5
    })).toBe('ADD GAME IQ RATING');
  });

  it('returns specific text when only GK is missing', () => {
    expect(getRatingButtonText({
      attack_rating: 7,
      defense_rating: 6,
      game_iq_rating: 8,
      gk_rating: null
    })).toBe('ADD GK RATING');
  });

  it('returns "COMPLETE RATING" for multiple missing ratings', () => {
    expect(getRatingButtonText({
      attack_rating: 7,
      defense_rating: null,
      game_iq_rating: null,
      gk_rating: 5
    })).toBe('COMPLETE RATING');
  });
});
