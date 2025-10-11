# Playstyle "TBD" Display Issue Fix (2025-10-11)

## Problem Summary
Playstyle badges on player cards were showing "TBD" for all players on three key pages:
- `RegisteredPlayers.tsx` (before player selection)
- `PlayerSelectionResults.tsx` (after player selection - selected/reserve/dropped out)
- `TeamSelectionResults.tsx` (after team balancing - blue/orange teams)

Players with 5+ playstyle ratings should have been displaying their playstyle name (e.g., "Box-to-Box", "Finisher", "Engine") but instead showed "TBD" regardless of rating count.

**Expected Behavior**: Players with ≥5 ratings show playstyle name, players with <5 ratings show "TBD"
**Actual Behavior**: All players showed "TBD"

## Root Cause Analysis

The issue was caused by missing `playstyleRatingsCount` prop throughout the component tree. The playstyle display logic in `PlayerCardFront.tsx` (lines 332-336) requires three pieces of data:

```tsx
const hasEnoughRatings = playstyleRatingsCount && playstyleRatingsCount >= 5;
const displayText = hasEnoughRatings ? averagedPlaystyle : 'TBD';
```

While `averagedPlaystyle` and `playstyleMatchDistance` were being fetched and passed correctly, `playstyleRatingsCount` was missing at various points in the data flow chain.

### Data Flow Chain

The correct flow for playstyle data:

1. **Database**: `player_derived_attributes.total_ratings_count` stores the count
2. **Fetch**: Components query this field
3. **Map**: Create `derivedAttrsMap` including `total_ratings_count`
4. **Stats**: Add to `playerStats` object as `playstyleRatingsCount`
5. **Props**: Pass to child components
6. **PlayerCard**: Receives and uses `playstyleRatingsCount` prop

### What Was Missing

#### PlayerSelectionResults.tsx
- ❌ Missing `total_ratings_count` in database query (line 286)
- ❌ Missing in `derivedAttrsMap` (line 311)
- ❌ Missing in `playerStats` object (line 420)
- ❌ Not passed to PlayerCard in 3 sections (selected/reserve/dropped out)

#### TeamSelectionResults.tsx
- ❌ Missing `total_ratings_count` in database query (line 209)
- ❌ Missing in `derivedAttrsMap` (line 234)
- ❌ Missing in `playerStats` object (line 347)
- ❌ Not passed to PlayerCard for blue/orange teams

#### PlayerList.tsx (shared component)
- ❌ **Critical**: Not passing `playstyleRatingsCount` to PlayerCard despite receiving it from parent

#### RegisteredPlayers.tsx
- ✅ Hook (`useGameRegistrationStats`) correctly fetched data
- ✅ `RegisteredPlayerGrid` correctly passed prop
- ⚠️ Would have failed due to PlayerList issue if it used that component

## Solution

### 1. PlayerSelectionResults.tsx

**Added to database query:**
```tsx
const { data: derivedAttrsData, error: derivedAttrsError } = await supabase
  .from('player_derived_attributes')
  .select(`
    player_id,
    pace_rating,
    shooting_rating,
    passing_rating,
    dribbling_rating,
    defending_rating,
    physical_rating,
    total_ratings_count  // ADDED
  `)
  .in('player_id', playerIds);
```

**Added to derivedAttrsMap:**
```tsx
const derivedAttrsMap = derivedAttrsData?.reduce((acc: any, player: any) => ({
  ...acc,
  [player.player_id]: {
    pace_rating: player.pace_rating,
    shooting_rating: player.shooting_rating,
    passing_rating: player.passing_rating,
    dribbling_rating: player.dribbling_rating,
    defending_rating: player.defending_rating,
    physical_rating: player.physical_rating,
    total_ratings_count: player.total_ratings_count  // ADDED
  }
}), {});
```

**Added to playerStats:**
```tsx
averagedPlaystyle: playstyleMatch?.playstyleName,
playstyleMatchDistance: playstyleMatch?.matchDistance,
playstyleCategory: playstyleMatch?.category,
playstyleRatingsCount: derivedAttrsMap[player.id]?.total_ratings_count || 0,  // ADDED
recentGames: recentGamesMap?.[player.id] || 0,
```

**Passed to PlayerCard (3 locations - selected/reserve/dropped out):**
```tsx
playstyleRatingsCount: playerStats[player.id]?.playstyleRatingsCount || 0,
```

### 2. TeamSelectionResults.tsx

Applied the same 4 fixes as PlayerSelectionResults:
1. Added to database query (line 219)
2. Added to derivedAttrsMap (line 244)
3. Added to playerStats (line 352)
4. Passed to PlayerCard for both blue and orange teams (lines 463, 519)

### 3. PlayerList.tsx (Shared Component)

**Added missing prop:**
```tsx
<PlayerCard
  // ... other props
  averagedPlaystyle={player.averagedPlaystyle}
  playstyleMatchDistance={player.playstyleMatchDistance}
  playstyleCategory={player.playstyleCategory}
  playstyleRatingsCount={player.playstyleRatingsCount}  // ADDED
  recentGames={player.recentGames}
  gameParticipation={player.gameParticipation}
/>
```

This fix benefits any component that uses `PlayerList`, including potential future uses.

### 4. RegisteredPlayers.tsx

No changes required. The hook (`useGameRegistrationStats`) was already:
- Fetching `total_ratings_count` from database (line 105)
- Including it in playerStats as `playstyleRatingsCount` (line 260)
- `RegisteredPlayerGrid` was passing it correctly (line 84)

## Files Modified

1. `/src/components/games/PlayerSelectionResults.tsx`
   - Added database query field
   - Added to data mapping
   - Passed to PlayerCard components

2. `/src/components/games/TeamSelectionResults.tsx`
   - Added database query field
   - Added to data mapping
   - Passed to PlayerCard components

3. `/src/components/games/PlayerList.tsx`
   - Added prop to PlayerCard (critical shared component fix)

## Testing Verification

### Database Verification
Confirmed players with 5+ ratings in `player_derived_attributes`:
```sql
SELECT
  p.friendly_name,
  pda.total_ratings_count,
  pda.pace_rating,
  pda.shooting_rating
FROM player_derived_attributes pda
JOIN players p ON pda.player_id = p.id
WHERE pda.total_ratings_count >= 5;
```

Results showed 10+ players with sufficient ratings (Phil R: 6, Jarman: 6, Paul: 6, etc.)

### Manual Testing
After fix, verified on each page:
1. **PlayerList** - Shows playstyles correctly (was already working due to `usePlayerGrid` hook)
2. **RegisteredPlayers** - Now shows playstyles (was broken due to PlayerList component)
3. **PlayerSelectionResults** - Now shows playstyles (was completely broken)
4. **TeamSelectionResults** - Now shows playstyles (was completely broken)

Players with <5 ratings correctly show "TBD" with tooltip "Needs X more ratings"

## Related Documentation

- `/docs/guides/adding-player-stats.md` - Guide for adding new stats (followed this pattern)
- `/docs/components/PlayerCard.md` - Player card component documentation
- `/docs/features/PlaystyleRatingSystem.md` - Main playstyle system documentation
- `/docs/fixes/PlaystyleFeatureVisibilityIssue.md` - Related playstyle feature flag issue

## Lessons Learned

### Pattern to Follow
When adding new stats that need to display on player cards across multiple pages:

1. **Database Query**: Add field to SELECT statement
2. **Data Mapping**: Add to intermediate map objects (e.g., `derivedAttrsMap`)
3. **Stats Object**: Add to final `playerStats` object
4. **Component Props**: Pass to `PlayerCard` in all locations
5. **Shared Components**: Check all shared components (like `PlayerList`) pass the prop through

### Common Pitfall
Having data fetched and mapped correctly but forgetting to pass it through shared components. Always check the entire component tree from data fetch to final render.

### Debugging Tip
When player cards show unexpected default values:
1. Check database has the data (`player_derived_attributes` table)
2. Check query includes the field
3. Check intermediate mappings include the field
4. Check `playerStats` object includes the field
5. Check ALL components in the tree pass the prop
6. Check `PlayerCard` receives and uses the prop

## Impact

- **User Experience**: Players can now see their playstyle classifications on all game-related pages
- **Data Visibility**: Ratings count properly influences display across the entire application
- **Consistency**: All pages now show playstyle data consistently
- **Future-Proof**: Fix to `PlayerList` component benefits any future pages that use it

## Timeline

- **2025-09-05**: Playstyle system implemented
- **2025-09-17**: Playstyle feature released to all users
- **2025-10-11**: Issue discovered - all player cards showing "TBD"
- **2025-10-11**: Issue fixed - proper playstyle display restored
