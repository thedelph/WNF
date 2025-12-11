# Game Participation Wheel - RegisteredPlayers Fix

**Date**: 2025-10-10
**Author**: Claude Code
**Issue**: GameParticipationWheel not displaying highlighted segments on RegisteredPlayers page

## Problem

The GameParticipationWheel component introduced on 2025-10-09 (Reserve Status Visualization feature) was working correctly on the PlayerList page but showing no highlighted segments on the RegisteredPlayers page (game registration view). The wheel rendered, but all 40 segments appeared dim/inactive, even for players who had participated in many of the last 40 games.

## Root Cause

The `useGameRegistrationStats` hook was missing the complete implementation for the Reserve Status Visualization feature. While the initial implementation (2025-10-09) correctly updated `usePlayerGrid`, the parallel updates to `useGameRegistrationStats` were incomplete:

### Missing Implementation (useGameRegistrationStats.ts)

1. **Query Status Filter**: Only fetching `'selected'` registrations, not `'reserve'`
   ```typescript
   // Was: .eq('status', 'selected')
   // Should be: .in('status', ['selected', 'reserve'])
   ```

2. **Type Definition**: `gameParticipation` field missing from `PlayerStats` interface

3. **Game Index Mapping**: No mapping of game IDs to their position (0-39) in the 40-game window

4. **Participation Array**: Not building the `Array<'selected' | 'reserve' | 'dropped_out' | null>` that tracks status for each of 40 games

5. **Data Return**: Not including `gameParticipation` in returned stats object

### Missing Prop (RegisteredPlayerGrid.tsx)

The `RegisteredPlayerGrid` component wasn't passing `gameParticipation` to `PlayerCard`, so the wheel always received the default empty array `new Array(40).fill(null)`.

## Solution

### 1. Updated useGameRegistrationStats.ts

**a) Query all relevant status types (line 147)**
```typescript
.in('status', ['selected', 'reserve', 'dropped_out'])  // All participation statuses
```

**b) Added gameParticipation to interface (line 31)**
```typescript
interface PlayerStats {
  // ... existing fields
  gameParticipation?: Array<'selected' | 'reserve' | 'dropped_out' | null>;
}
```

**c) Created game ID to index mapping (lines 125-130)**
```typescript
const gameIdToIndexMap = (latestGameData || []).reduce((acc, game, index) => {
  acc[game.id] = 39 - index;  // 0 = oldest, 39 = most recent
  return acc;
}, {} as Record<string, number>);
```

**d) Built participation array (lines 177-190)**
```typescript
const recentGamesParticipationMap = gameRegistrationsData?.reduce((acc: any, registration: any) => {
  const playerId = registration.player_id;
  const gameIndex = gameIdToIndexMap[registration.game_id];

  if (!acc[playerId]) {
    acc[playerId] = new Array(40).fill(null);
  }

  if (gameIndex !== undefined) {
    acc[playerId][gameIndex] = registration.status; // 'selected', 'reserve', or 'dropped_out'
  }

  return acc;
}, {} as Record<string, Array<'selected' | 'reserve' | 'dropped_out' | null>>) || {};
```

**e) Maintained backward compatibility (lines 193-196)**
```typescript
// Count only 'selected' for recentGames (existing behavior)
const recentGamesMap = Object.entries(recentGamesParticipationMap).reduce((acc: any, [playerId, participation]) => {
  acc[playerId] = participation.filter(status => status === 'selected').length;
  return acc;
}, {} as Record<string, number>);
```

**f) Included in returned stats (line 262)**
```typescript
gameParticipation: recentGamesParticipationMap[player.id] || new Array(40).fill(null)
```

### 2. Updated RegisteredPlayerGrid.tsx

**Added gameParticipation prop (line 86)**
```typescript
<PlayerCard
  // ... existing props
  gameParticipation={playerStats[registration.player.id]?.gameParticipation || new Array(40).fill(null)}
/>
```

## Files Modified

1. **src/hooks/useGameRegistrationStats.ts**
   - Line 31: Added `gameParticipation` to `PlayerStats` interface
   - Line 147: Changed query to fetch both 'selected' and 'reserve' statuses
   - Lines 125-130: Created `gameIdToIndexMap` for position mapping
   - Lines 177-196: Built `recentGamesParticipationMap` array and backward-compatible count
   - Line 262: Included `gameParticipation` in returned stats

2. **src/components/game/RegisteredPlayerGrid.tsx**
   - Line 86: Added `gameParticipation` prop to `PlayerCard` component

## Implementation Notes

### Why the Initial Implementation Was Incomplete

The Reserve Status Visualization feature documentation (2025-10-09) listed both hooks as implementation files, but only `usePlayerGrid` received the complete implementation. The `useGameRegistrationStats` hook retained the old logic that:
- Only fetched 'selected' statuses
- Calculated `recentGames` count but not the participation array
- Didn't include the 4-state tracking (`'selected' | 'reserve' | 'dropped_out' | null`)

### Consistency with usePlayerGrid

This fix brings `useGameRegistrationStats` into full parity with `usePlayerGrid.ts` (lines 100-220), which was correctly implemented on 2025-10-09. Both hooks now:
1. Fetch both 'selected' and 'reserve' registrations
2. Create game ID to index mapping
3. Build the full participation array
4. Return `gameParticipation` data to components

### Testing

After implementation:
- RegisteredPlayers page now shows colored wheel segments for played games
- White segments appear for reserve registrations
- Black segments appear for dropout games (added 2025-12-11)
- Dim segments show games where player didn't register
- Display matches PlayerList page behavior exactly

## Related Documentation

- [Reserve Status Visualization Feature](../features/ReserveStatusVisualization.md) - Original feature (2025-10-09)
- [Recent Games Query Limit Fix](./RecentGamesQueryLimitFix.md) - Query optimization (2025-10-09)
- [Player Card Component](../components/PlayerCard.md) - Component documentation

## Prevention

When implementing features that affect multiple similar hooks (`usePlayerGrid` and `useGameRegistrationStats`), ensure:
1. All implementations are tested in all contexts (PlayerList AND RegisteredPlayers pages)
2. Visual features like wheels/charts are verified to display correctly across all views
3. Code review checks for parity between parallel implementations
4. Documentation lists specific lines changed in each file for verification
