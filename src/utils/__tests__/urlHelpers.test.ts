import { describe, it, expect } from 'vitest';
import { toUrlFriendly, fromUrlFriendly } from '../urlHelpers';

describe('toUrlFriendly', () => {
  it('converts spaces to hyphens and lowercases', () => {
    expect(toUrlFriendly('John Smith')).toBe('john-smith');
  });

  it('handles underscores', () => {
    expect(toUrlFriendly('John_Smith')).toBe('john-smith');
  });

  it('removes special characters', () => {
    expect(toUrlFriendly("O'Brien Jr.")).toBe('obrien-jr');
  });

  it('collapses consecutive hyphens', () => {
    expect(toUrlFriendly('John  -  Smith')).toBe('john-smith');
  });

  it('removes leading and trailing hyphens', () => {
    expect(toUrlFriendly(' - John Smith - ')).toBe('john-smith');
  });

  it('handles already URL-friendly input', () => {
    expect(toUrlFriendly('john-smith')).toBe('john-smith');
  });

  it('handles numbers', () => {
    expect(toUrlFriendly('Player 123')).toBe('player-123');
  });
});

describe('fromUrlFriendly', () => {
  it('converts hyphens to spaces and capitalizes', () => {
    expect(fromUrlFriendly('john-smith')).toBe('John Smith%');
  });

  it('appends wildcard for ILIKE queries', () => {
    const result = fromUrlFriendly('john');
    expect(result).toContain('%');
    expect(result).toBe('John%');
  });

  it('handles single word', () => {
    expect(fromUrlFriendly('john')).toBe('John%');
  });

  it('handles multiple hyphens', () => {
    expect(fromUrlFriendly('john-james-smith')).toBe('John James Smith%');
  });
});
