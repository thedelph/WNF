# Recent Games Query Limit Fix

**Date**: 2025-10-09
**Author**: Claude Code
**Issue**: Player cards showing incorrect "Last 40 Games" counts due to Supabase query row limit

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

1. **src/hooks/usePlayerGrid.ts** (lines 24-208)
   - Changed from parallel queries to sequential (fetch games first, then registrations)
   - Added `.in('game_id', last40GameIds)` filter to registration query
   - Simplified calculation logic to remove redundant sequence filtering
   - Query now returns ~718 rows instead of hitting 1,000 row limit

2. **src/hooks/useGameRegistrationStats.ts** (lines 110-172)
   - Applied identical fix as usePlayerGrid
   - Ensures consistent counts across player grid and game registration views

## Impact

### Query Efficiency
- **Before**: Fetched 1,175+ rows, truncated to 1,000, filtered in JavaScript
- **After**: Fetches exactly 718 rows (only last 40 games), no truncation

### Data Accuracy
All players now show correct "Last 40 Games" counts matching database reality:
- Chris H: 28 → **36** ✓
- Daniel: 27 → **37** ✓

## Prevention

1. **Query Limits**: Always be aware of Supabase's 1,000 row default limit when fetching large datasets
2. **Filter Early**: Apply filters at the database level before hitting row limits
3. **Test with Production Data**: Mock data with low row counts won't expose these issues
4. **Monitor Debug Logs**: Watch for `totalRegistrations` values approaching 1,000 as a warning sign

## Testing

After implementation:
- All players display accurate "Last 40 Games" counts
- Console log shows `totalRegistrations: 718` (down from 1,000+)
- Debug output includes sample counts for verification
- No data truncation warnings in browser console
