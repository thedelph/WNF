import { describe, it, expect } from 'vitest';
import {
  classifyPositions,
  getPrimaryPosition,
  formatPositionConsensus,
  getPositionBadgeColor,
  hasSufficientPositionData,
  getInsufficientDataMessage,
  validatePositionSelectionCount,
  getPositionCodesForCategory,
  calculateDefensiveResponsibility
} from '../positionClassifier';
import { PositionConsensus } from '../../types/positions';

function makeConsensus(
  position: string,
  percentage: number,
  totalRaters = 10
): PositionConsensus {
  return {
    player_id: 'test-player',
    position: position as any,
    rating_count: Math.round((percentage / 100) * totalRaters),
    total_raters: totalRaters,
    percentage,
    points: Math.round((percentage / 100) * totalRaters * 6),
    rank_1_count: 0,
    rank_2_count: 0,
    rank_3_count: 0,
    updated_at: '2025-01-01'
  };
}

describe('classifyPositions', () => {
  it('classifies positions by threshold tiers (9+ raters = 50% primary)', () => {
    const data = [
      makeConsensus('LB', 75, 10),
      makeConsensus('CB', 55, 10),
      makeConsensus('CM', 35, 10),
      makeConsensus('ST', 10, 10),
    ];

    const result = classifyPositions(data);
    expect(result.primary.map(p => p.position)).toEqual(['LB', 'CB']);
    expect(result.secondary.map(p => p.position)).toEqual(['CM']);
    expect(result.mentioned.map(p => p.position)).toEqual(['ST']);
  });

  it('uses adaptive threshold for small groups (1-3 raters = 25%)', () => {
    const data = [
      makeConsensus('LB', 30, 2),
      makeConsensus('CB', 20, 2),
    ];

    const result = classifyPositions(data);
    // With 2 raters, threshold is 25%, so 30% is primary
    expect(result.primary.map(p => p.position)).toEqual(['LB']);
  });

  it('filters out 0% positions', () => {
    const data = [
      makeConsensus('LB', 75, 10),
      makeConsensus('CB', 0, 10),
    ];

    const result = classifyPositions(data);
    expect(result.primary).toHaveLength(1);
    expect(result.secondary).toHaveLength(0);
    expect(result.mentioned).toHaveLength(0);
  });

  it('sorts positions by percentage descending', () => {
    const data = [
      makeConsensus('CM', 60, 10),
      makeConsensus('LB', 80, 10),
      makeConsensus('ST', 70, 10),
    ];

    const result = classifyPositions(data);
    expect(result.primary[0].position).toBe('LB');
    expect(result.primary[1].position).toBe('ST');
    expect(result.primary[2].position).toBe('CM');
  });

  it('marks hasSufficientData false when below MIN_RATERS', () => {
    const data = [makeConsensus('LB', 75, 3)];
    expect(classifyPositions(data).hasSufficientData).toBe(false);
  });

  it('marks hasSufficientData true when at MIN_RATERS', () => {
    const data = [makeConsensus('LB', 75, 5)];
    expect(classifyPositions(data).hasSufficientData).toBe(true);
  });
});

describe('getPrimaryPosition', () => {
  it('returns highest primary position', () => {
    const data = [
      makeConsensus('LB', 75, 10),
      makeConsensus('CB', 55, 10),
      makeConsensus('CM', 30, 10),
    ];
    expect(getPrimaryPosition(data)).toBe('LB');
  });

  it('returns null when no positions above threshold', () => {
    const data = [
      makeConsensus('LB', 20, 10),
      makeConsensus('CB', 15, 10),
    ];
    expect(getPrimaryPosition(data)).toBeNull();
  });

  it('returns null for empty data', () => {
    expect(getPrimaryPosition([])).toBeNull();
  });
});

describe('formatPositionConsensus', () => {
  it('formats position with percentage', () => {
    const consensus = makeConsensus('LB', 75.5, 10);
    expect(formatPositionConsensus(consensus)).toBe('LB 76%');
  });

  it('includes raw counts when requested', () => {
    const consensus = makeConsensus('LB', 75, 10);
    const result = formatPositionConsensus(consensus, true);
    expect(result).toContain('LB');
    expect(result).toContain('75%');
    expect(result).toContain('/10)');
  });
});

describe('getPositionBadgeColor', () => {
  it('returns primary style for 50%+', () => {
    expect(getPositionBadgeColor(50)).toBe('bg-primary text-primary-content');
    expect(getPositionBadgeColor(100)).toBe('bg-primary text-primary-content');
  });

  it('returns secondary style for 25-49%', () => {
    expect(getPositionBadgeColor(25)).toBe('bg-primary/40 text-primary-content');
    expect(getPositionBadgeColor(49)).toBe('bg-primary/40 text-primary-content');
  });

  it('returns base style for below 25%', () => {
    expect(getPositionBadgeColor(24)).toBe('bg-base-300 text-base-content');
    expect(getPositionBadgeColor(0)).toBe('bg-base-300 text-base-content');
  });
});

describe('hasSufficientPositionData', () => {
  it('returns true for 5+ raters', () => {
    expect(hasSufficientPositionData(5)).toBe(true);
    expect(hasSufficientPositionData(10)).toBe(true);
  });

  it('returns false for fewer than 5 raters', () => {
    expect(hasSufficientPositionData(4)).toBe(false);
    expect(hasSufficientPositionData(0)).toBe(false);
  });
});

describe('getInsufficientDataMessage', () => {
  it('returns empty string when sufficient data', () => {
    expect(getInsufficientDataMessage(5)).toBe('');
    expect(getInsufficientDataMessage(10)).toBe('');
  });

  it('formats message with correct counts', () => {
    expect(getInsufficientDataMessage(3)).toBe('Need 2 more raters (3/5)');
    expect(getInsufficientDataMessage(4)).toBe('Need 1 more rater (4/5)');
    expect(getInsufficientDataMessage(0)).toBe('Need 5 more raters (0/5)');
  });
});

describe('validatePositionSelectionCount', () => {
  it('returns null for valid counts', () => {
    expect(validatePositionSelectionCount(1)).toBeNull();
    expect(validatePositionSelectionCount(3)).toBeNull();
  });

  it('returns warning for too many positions', () => {
    const result = validatePositionSelectionCount(4);
    expect(result).toContain('4 positions');
    expect(result).toContain('top 3');
  });
});

describe('getPositionCodesForCategory', () => {
  it('returns defense positions', () => {
    const positions = getPositionCodesForCategory('defense');
    expect(positions).toContain('LB');
    expect(positions).toContain('CB');
    expect(positions).toContain('RB');
  });

  it('returns attack positions', () => {
    const positions = getPositionCodesForCategory('attack');
    expect(positions).toContain('ST');
  });

  it('returns midfield positions', () => {
    const positions = getPositionCodesForCategory('midfield');
    expect(positions).toContain('CM');
    expect(positions).toContain('CAM');
    expect(positions).toContain('CDM');
  });
});

describe('calculateDefensiveResponsibility', () => {
  it('returns 0 for empty positions', () => {
    expect(calculateDefensiveResponsibility([])).toBe(0);
  });

  it('returns 0 for insufficient data', () => {
    const data = [makeConsensus('LB', 75, 3)]; // only 3 raters
    expect(calculateDefensiveResponsibility(data)).toBe(0);
  });

  it('returns high score for defensive positions', () => {
    const data = [
      makeConsensus('CB', 80, 10),
      makeConsensus('LB', 60, 10),
    ];
    const score = calculateDefensiveResponsibility(data);
    // Both positions have high defensive weight (100)
    expect(score).toBeGreaterThan(80);
  });

  it('returns low score for attacking positions', () => {
    const data = [
      makeConsensus('ST', 80, 10),
      makeConsensus('CAM', 60, 10),
    ];
    const score = calculateDefensiveResponsibility(data);
    // Both positions have low defensive weight (0)
    expect(score).toBe(0);
  });
});
