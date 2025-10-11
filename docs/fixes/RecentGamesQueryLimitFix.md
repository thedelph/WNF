# Recent Games Query Limit Fix

**Date**: 2025-10-09 (Updated 2025-10-11)
**Author**: Claude Code
**Issue**: Player cards showing incorrect "Last 40 Games" counts due to Supabase query row limit

**Update 2025-10-11**: Extended fix to PlayerSelectionResults and TeamSelectionResults components. Also fixed index order inconsistency in participation arrays.

## Problem

The "Last 40 Games" statistic on player cards was displaying significantly lower values than actual player participation. For example:

- **Chris H**: Database showed 36 games, frontend displayed 28 (8 missing)
- **Daniel**: Database showed 37 games, frontend displayed 27 (10 missing)

This affected both the main player grid (`usePlayerGrid`) and game registration stats (`useGameRegistrationStats`).

## Root Cause

The `game_registrations` query was fetching **ALL** historical game registrations (1,175+ total rows) without filtering to just the last 40 games. Supabase has a **default row limit of 1,000**, causing the query results to be silently truncated.

### Query Structure Issue

**Before (Broken)**:
```typescript
// This fetched ALL game registrations (1,175+ rows)
() => supabase
  .from('game_registrations')
  .select(`
    player_id,
    status,
    games!inner (
      sequence_number,
      is_historical,
      completed
    )
  `)
  .eq('games.is_historical', true)
  .eq('games.completed', true)
  .eq('status', 'selected')
```

The code then attempted to filter in JavaScript using a cutoff sequence number, but it was working with incomplete data (only 1,000 of 1,175 rows).

## Solution

Restructured the queries to filter at the **database level** before hitting the row limit:

### 1. Sequential Query Structure

**After (Fixed)**:
```typescript
// Step 1: Get last 40 games to obtain their IDs
const { data: latestGameData, error: gamesError } = await supabase
  .from('games')
  .select('id, sequence_number')
  .eq('completed', true)
  .eq('is_historical', true)
  .order('sequence_number', { ascending: false })
  .limit(40);

if (gamesError) throw gamesError;

// Step 2: Get game IDs
const last40GameIds = (latestGameData || []).map(g => g.id);

// Step 3: Fetch registrations ONLY for those 40 games (718 rows vs 1,175)
() => supabase
  .from('game_registrations')
  .select(`
    player_id,
    game_id,
    status,
    games!inner (
      sequence_number,
      is_historical,
      completed
    )
  `)
  .in('game_id', last40GameIds)  // Filter by specific game IDs
  .eq('status', 'selected')
```

### 2. Simplified Calculation Logic

Since we're now only fetching registrations for the last 40 games, the calculation becomes straightforward:

**Before (Complex)**:
```typescript
const cutoffSequence = last40Games.length > 0
  ? Math.min(...last40SequenceNumbers) - 1
  : 0;

const recentGamesMap = (gameRegistrationsData || []).reduce((acc, registration) => {
  const gameSequence = registration.games.sequence_number;
  if (gameSequence > cutoffSequence) {  // Filtering incomplete data
    acc[playerId] = (acc[playerId] || 0) + 1;
  }
  return acc;
}, {});
```

**After (Simple)**:
```typescript
// Just count registrations per player (data is already filtered)
const recentGamesMap = (gameRegistrationsData || []).reduce((acc, registration) => {
  const playerId = registration.player_id;
  acc[playerId] = (acc[playerId] || 0) + 1;
  return acc;
}, {});
```

## Files Modified

### Initial Fix (2025-10-09)

1. **src/hooks/usePlayerGrid.ts** (lines 24-208)
   - Changed from parallel queries to sequential (fetch games first, then registrations)
   - Added `.in('game_id', last40GameIds)` filter to registration query
   - Simplified calculation logic to remove redundant sequence filtering
   - Query now returns ~718 rows instead of hitting 1,000 row limit

2. **src/hooks/useGameRegistrationStats.ts** (lines 110-172)
   - Applied identical fix as usePlayerGrid
   - Ensures consistent counts across player grid and game registration views
   - Includes reserve status tracking in participation arrays

### Extension & Index Order Fix (2025-10-11)

3. **src/components/games/PlayerSelectionResults.tsx** (lines 342-389)
   - Added sequential query structure for recent games data
   - Implemented participation array with correct index order (39 - index)
   - Extended to show both selected and reserve status in GameParticipationWheel
   - Fixed: Wheel segments were displaying backwards (newest to oldest instead of oldest to newest)

4. **src/components/games/TeamSelectionResults.tsx** (lines 265-312)
   - Applied identical implementation as PlayerSelectionResults
   - Ensures team selection page shows accurate recent games data
   - Fixed same index order issue for consistency across all views

## Impact

### Query Efficiency
- **Before**: Fetched 1,175+ rows, truncated to 1,000, filtered in JavaScript
- **After**: Fetches exactly 718 rows (only last 40 games), no truncation

### Data Accuracy
All players now show correct "Last 40 Games" counts matching database reality:
- Chris H: 28 → **36** ✓
- Daniel: 27 → **37** ✓

## Index Order Issue (Discovered 2025-10-11)

### Problem
When implementing the fix in PlayerSelectionResults and TeamSelectionResults, the GameParticipationWheel segments displayed in reverse order (newest games on left, oldest on right) compared to other components.

### Root Cause
The canonical implementation in `useGameRegistrationStats.ts` reverses array indices when building participation arrays:

```typescript
// Lines 126-130 in useGameRegistrationStats.ts
const gameIdToIndexMap = (latestGameData || []).reduce((acc, game, index) => {
  // Reverse the index so 0 is the oldest game and 39 is the most recent
  acc[game.id] = 39 - index;
  return acc;
}, {} as Record<string, number>);
```

**Standard**: Index 0 = oldest game, Index 39 = most recent game

The initial implementation in PlayerSelectionResults and TeamSelectionResults used raw indices without reversing, causing the wheel to display backwards.

### Solution
Updated both components to match the canonical index order:

```typescript
// Use 39 - index when building participation arrays
latestGameData?.forEach((game, index) => {
  if (registration) {
    participation[39 - index] = registration.status;
  }
});
```

### Lesson Learned
When implementing features that display chronological data across multiple components, establish and document the canonical index order early. All implementations must strictly follow the same convention to ensure visual consistency.

## Prevention

1. **Query Limits**: Always be aware of Supabase's 1,000 row default limit when fetching large datasets
2. **Filter Early**: Apply filters at the database level before hitting row limits
3. **Test with Production Data**: Mock data with low row counts won't expose these issues
4. **Monitor Debug Logs**: Watch for `totalRegistrations` values approaching 1,000 as a warning sign
5. **Index Order Consistency**: When implementing participation/timeline arrays, always reference the canonical implementation (useGameRegistrationStats.ts) for correct index ordering

## Testing

### Initial Fix (2025-10-09)
- All players display accurate "Last 40 Games" counts
- Console log shows `totalRegistrations: 718` (down from 1,000+)
- Debug output includes sample counts for verification
- No data truncation warnings in browser console

### Extension & Index Order Fix (2025-10-11)
- PlayerSelectionResults page shows correct recent games counts
- TeamSelectionResults page shows correct recent games counts
- GameParticipationWheel segments display in correct chronological order (oldest to newest, left to right)
- All components (PlayerList, RegisteredPlayers, PlayerSelectionResults, TeamSelectionResults) show consistent wheel visualization
- Reserve status (white segments) displays correctly alongside selected status (colored segments)
