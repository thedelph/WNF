import { describe, it, expect } from 'vitest';
import {
  calculateSelectionOdds,
  formatOdds,
  getOddsColorClass,
  PlayerOdds
} from '../selectionOdds';

describe('calculateSelectionOdds', () => {
  const makeReg = (id: string, usingToken = false) => ({
    player: { id, using_token: usingToken }
  });

  it('returns 100% for everyone when registrations <= maxPlayers', () => {
    const regs = [makeReg('a'), makeReg('b'), makeReg('c')];
    const stats = {};
    const odds = calculateSelectionOdds(regs, stats, new Set(), 2, 1, 5);

    expect(odds.get('a')?.percentage).toBe(100);
    expect(odds.get('b')?.percentage).toBe(100);
    expect(odds.get('c')?.percentage).toBe(100);
  });

  it('guarantees token users', () => {
    const regs = [
      makeReg('token-user', true),
      makeReg('a'),
      makeReg('b'),
      makeReg('c'),
      makeReg('d')
    ];
    const stats = {};
    // 4 max players, 2 xp slots, 1 random slot
    const odds = calculateSelectionOdds(regs, stats, new Set(), 2, 1, 4);

    expect(odds.get('token-user')?.status).toBe('guaranteed');
    expect(odds.get('token-user')?.percentage).toBe(100);
  });

  it('gives merit players 100% when safely within XP slots', () => {
    const regs = [
      makeReg('a'), // index 0 - within xpSlots
      makeReg('b'), // index 1 - within xpSlots
      makeReg('c'), // index 2 - random zone
      makeReg('d'), // index 3 - random zone
      makeReg('e'), // index 4 - random zone
    ];
    const stats = {};
    const odds = calculateSelectionOdds(regs, stats, new Set(), 2, 2, 4);

    expect(odds.get('a')?.status).toBe('merit');
    expect(odds.get('a')?.percentage).toBe(100);
    expect(odds.get('b')?.status).toBe('merit');
    expect(odds.get('b')?.percentage).toBe(100);
  });

  it('calculates random zone probabilities based on bench warmer streaks', () => {
    const regs = [
      makeReg('merit1'),
      makeReg('veteran'), // high streak
      makeReg('newbie'),  // no streak
    ];
    const stats: Record<string, { benchWarmerStreak?: number }> = {
      veteran: { benchWarmerStreak: 5 },
      newbie: { benchWarmerStreak: 0 }
    };
    // 1 xp slot, 1 random slot, 2 max - so 2 in random zone competing for 1 slot
    const odds = calculateSelectionOdds(regs, stats, new Set(), 1, 1, 2);

    const veteranOdds = odds.get('veteran');
    const newbieOdds = odds.get('newbie');

    expect(veteranOdds).toBeDefined();
    expect(newbieOdds).toBeDefined();
    // Veteran with 5 streak (6 points) should have much higher odds than newbie (1 point)
    expect(veteranOdds!.percentage).toBeGreaterThan(newbieOdds!.percentage);
  });

  it('gives token cooldown players 0% when enough eligible players exist', () => {
    const regs = [
      makeReg('merit1'),
      makeReg('eligible1'),
      makeReg('eligible2'),
      makeReg('cooldown1'),
    ];
    const stats = {};
    // 1 xp, 2 random, 3 max - cooldown player competes with 2 eligible for 2 slots
    const odds = calculateSelectionOdds(regs, stats, new Set(['cooldown1']), 1, 2, 3);

    // 2 eligible players for 2 random slots = they fill them all
    expect(odds.get('cooldown1')?.percentage).toBe(0);
  });

  it('gives token cooldown players a chance when not enough eligible players', () => {
    const regs = [
      makeReg('merit1'),
      makeReg('eligible1'),
      makeReg('cooldown1'),
    ];
    const stats = {};
    // 1 xp, 2 random, 3 max - only 1 eligible for 2 random slots
    const odds = calculateSelectionOdds(regs, stats, new Set(['cooldown1']), 1, 2, 3);

    expect(odds.get('cooldown1')?.percentage).toBeGreaterThan(0);
  });
});

describe('formatOdds', () => {
  it('shows percentage for random zone players', () => {
    const odds: PlayerOdds = { percentage: 75, status: 'random', description: '' };
    expect(formatOdds(odds)).toBe('75%');
  });

  it('shows "Guaranteed" for 100% players', () => {
    const odds: PlayerOdds = { percentage: 100, status: 'guaranteed', description: '' };
    expect(formatOdds(odds)).toBe('Guaranteed');
  });

  it('shows "At Risk" for merit players below 100%', () => {
    const odds: PlayerOdds = { percentage: 85, status: 'merit', description: '' };
    expect(formatOdds(odds)).toBe('At Risk');
  });
});

describe('getOddsColorClass', () => {
  it('returns success for 100%', () => {
    expect(getOddsColorClass({ percentage: 100, status: 'guaranteed', description: '' }))
      .toBe('text-success');
  });

  it('returns success for 85%+', () => {
    expect(getOddsColorClass({ percentage: 85, status: 'merit', description: '' }))
      .toBe('text-success');
  });

  it('returns warning for 50-84%', () => {
    expect(getOddsColorClass({ percentage: 50, status: 'random', description: '' }))
      .toBe('text-warning');
    expect(getOddsColorClass({ percentage: 84, status: 'random', description: '' }))
      .toBe('text-warning');
  });

  it('returns error for below 50%', () => {
    expect(getOddsColorClass({ percentage: 49, status: 'random', description: '' }))
      .toBe('text-error');
    expect(getOddsColorClass({ percentage: 0, status: 'random', description: '' }))
      .toBe('text-error');
  });
});
