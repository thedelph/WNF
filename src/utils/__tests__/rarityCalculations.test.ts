import { describe, it, expect } from 'vitest';
import { getRarity, calculatePlayerXP } from '../rarityCalculations';

describe('getRarity', () => {
  it('returns the database rarity when provided', () => {
    expect(getRarity('Legendary')).toBe('Legendary');
    expect(getRarity('World Class')).toBe('World Class');
    expect(getRarity('Professional')).toBe('Professional');
    expect(getRarity('Semi Pro')).toBe('Semi Pro');
    expect(getRarity('Amateur')).toBe('Amateur');
    expect(getRarity('Academy')).toBe('Academy');
    expect(getRarity('Retired')).toBe('Retired');
  });

  it('returns Academy for null rarity with 0 XP', () => {
    expect(getRarity(null, 0)).toBe('Academy');
  });

  it('returns Amateur for null rarity with XP > 0', () => {
    expect(getRarity(null, 100)).toBe('Amateur');
    expect(getRarity(null)).toBe('Amateur');
  });

  it('returns Amateur for empty string rarity', () => {
    expect(getRarity('')).toBe('Amateur');
  });
});

describe('calculatePlayerXP', () => {
  it('returns caps as base XP with no modifiers', () => {
    expect(calculatePlayerXP({
      id: '1', user_id: '1', friendly_name: 'Test',
      avatar_svg: null, caps: 10, active_bonuses: 0,
      active_penalties: 0, current_streak: 0, max_streak: 0, xp: 0
    })).toBe(10);
  });

  it('applies bonus modifier (10% per bonus)', () => {
    expect(calculatePlayerXP({
      id: '1', user_id: '1', friendly_name: 'Test',
      avatar_svg: null, caps: 100, active_bonuses: 2,
      active_penalties: 0, current_streak: 0, max_streak: 0, xp: 0
    })).toBe(120); // 100 * (1 + 0.2)
  });

  it('applies penalty modifier (10% per penalty)', () => {
    expect(calculatePlayerXP({
      id: '1', user_id: '1', friendly_name: 'Test',
      avatar_svg: null, caps: 100, active_bonuses: 0,
      active_penalties: 3, current_streak: 0, max_streak: 0, xp: 0
    })).toBe(70); // 100 * (1 - 0.3)
  });

  it('applies streak modifier (10% per streak)', () => {
    expect(calculatePlayerXP({
      id: '1', user_id: '1', friendly_name: 'Test',
      avatar_svg: null, caps: 100, active_bonuses: 0,
      active_penalties: 0, current_streak: 5, max_streak: 5, xp: 0
    })).toBe(150); // 100 * (1 + 0.5)
  });

  it('combines all modifiers correctly', () => {
    expect(calculatePlayerXP({
      id: '1', user_id: '1', friendly_name: 'Test',
      avatar_svg: null, caps: 100, active_bonuses: 1,
      active_penalties: 1, current_streak: 2, max_streak: 2, xp: 0
    })).toBe(120); // 100 * (1 + 0.1 - 0.1 + 0.2) = 100 * 1.2
  });

  it('returns 0 for 0 caps regardless of modifiers', () => {
    expect(calculatePlayerXP({
      id: '1', user_id: '1', friendly_name: 'Test',
      avatar_svg: null, caps: 0, active_bonuses: 5,
      active_penalties: 0, current_streak: 10, max_streak: 10, xp: 0
    })).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculatePlayerXP({
      id: '1', user_id: '1', friendly_name: 'Test',
      avatar_svg: null, caps: 33, active_bonuses: 1,
      active_penalties: 0, current_streak: 0, max_streak: 0, xp: 0
    })).toBe(36); // 33 * 1.1 = 36.3 → 36
  });
});
