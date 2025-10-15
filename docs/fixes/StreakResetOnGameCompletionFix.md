# Streak Reset on Game Completion Fix

**Date:** 2025-10-15
**Migration:** `20251015_fix_streak_reset_on_game_completion.sql`
**Affected Players:** Mike M (and potentially others in the future)

## Problem Description

Player streaks were not being reset to 0 when players missed the most recent completed game. This resulted in players showing incorrect streak values.

### Specific Case
- **Player:** Mike M
- **Issue:** Current streak showed 1 when it should have been 0
- **Game History:**
  - Game #66 (Oct 1, 2025): PLAYED (status = 'selected')
  - Game #67 (Oct 8, 2025): DID NOT PLAY (status = null)
  - Game #67 was the most recent completed game

According to the XP system rules (see `docs/XPSystemExplained.md`), a player's streak should be 0 if they missed the most recent completed game.

### Initial Hypothesis: Priority Token Usage
Initially suspected that Mike M's use of a priority token might be related to the issue. However, investigation revealed:
- Mike M did **NOT** use a priority token for game #66 (`using_token = false`)
- Token history showed no usage records for games #66 or #67
- **Conclusion:** Priority tokens were not a factor in this bug

## Root Cause Analysis

The bug was in the `update_streaks_on_game_change()` trigger function that runs when games are marked as completed.

### Trigger Logic Flaw

The function had two main update sections:

1. **First Update:** Updated players who had active ongoing streaks
   ```sql
   UPDATE players p
   SET current_streak = COALESCE(ps.streak, 0)
   FROM player_streaks ps
   WHERE p.id = ps.player_id;
   ```

   **Problem:** This only updated players whose IDs appeared in the `player_streaks` CTE (i.e., players with current ongoing streaks).

2. **No Second Update:** There was no logic to reset streaks to 0 for players who:
   - Previously had a streak > 0
   - No longer qualified for a streak (missed the most recent game)

### Why Mike M Wasn't Updated

When game #67 completed:
1. Mike M's last game was #66 (before the most recent completed game #67)
2. Therefore, Mike M did NOT appear in the `player_streaks` CTE
3. His `current_streak` remained at 1 (from after game #66 completed)
4. No logic existed to reset it to 0

### Database Functions

The system had two related functions:
- `calculate_player_streak(player_id)`: Correctly calculates the current streak (returned 0 for Mike M) ✓
- `update_streaks_on_game_change()`: Trigger function that updates all player streaks (failed to reset Mike M's streak) ✗

## Solution

### Migration Changes

Added a second UPDATE statement to the `update_streaks_on_game_change()` function:

```sql
-- NEW: Reset streaks to 0 for players who previously had streaks but no longer qualify
UPDATE players p
SET current_streak = 0
WHERE p.current_streak > 0
AND p.id NOT IN (
    SELECT player_id FROM (
        SELECT p2.id as player_id
        FROM players p2
        JOIN game_registrations gr ON gr.player_id = p2.id
        JOIN games g ON g.id = gr.game_id
        WHERE gr.status = 'selected'
        AND g.completed = true
        AND NOT EXISTS (
            SELECT 1
            FROM games g2
            LEFT JOIN game_registrations gr2 ON gr2.game_id = g2.id AND gr2.player_id = p2.id
            WHERE g2.sequence_number > g.sequence_number
            AND g2.completed = true
            AND (gr2.id IS NULL OR gr2.status != 'selected')
        )
    ) active_streak_players
);
```

This logic:
1. Finds all players with `current_streak > 0`
2. Checks if they appear in the list of players with active ongoing streaks
3. If they don't appear (meaning their streak should be 0), sets their streak to 0

The same fix was applied for `bench_warmer_streak`.

### Immediate Recalculation

The migration also included a recalculation of all player streaks using the accurate `calculate_player_streak()` function:

```sql
UPDATE players
SET
    current_streak = calculate_player_streak(id),
    bench_warmer_streak = calculate_bench_warmer_streak(id)
WHERE id IS NOT NULL;
```

This ensured that any existing discrepancies (like Mike M's) were immediately corrected.

## Verification

After applying the migration:

### Mike M's Streak
```sql
SELECT friendly_name, current_streak, calculate_player_streak(id)
FROM players
WHERE friendly_name = 'Mike M';
```

**Result:**
- `current_streak`: 0 ✓
- `calculate_player_streak(id)`: 0 ✓
- **Status:** FIXED

### All Players
```sql
SELECT friendly_name, current_streak, calculate_player_streak(id)
FROM players
WHERE current_streak != calculate_player_streak(id);
```

**Result:** No mismatches found ✓

## Impact

### Before Fix
- Players who missed games could retain incorrect non-zero streak values
- Only affected players who:
  1. Had a streak > 0 from a previous game
  2. Missed the most recent completed game
  3. Did not register for the most recent completed game

### After Fix
- All players now have accurate streak values
- Future game completions will properly reset streaks for players who miss games
- The trigger function now handles both:
  - Updating streaks for players with ongoing streaks
  - Resetting streaks to 0 for players whose streaks should end

## Testing

To test that the fix works correctly for future games:

1. **Scenario:** Player has a streak, then misses the next game
2. **Expected:** Streak should reset to 0 when that game completes
3. **Verification Query:**
   ```sql
   SELECT
       friendly_name,
       current_streak,
       calculate_player_streak(id) as should_be
   FROM players
   WHERE current_streak != calculate_player_streak(id);
   ```
   Should return no rows.

## Related Documentation

- [XP System Documentation](../XPSystemExplained.md) - Details on how streaks are calculated
- [Token System Documentation](../TokenSystem.md) - Priority token system (unrelated to this bug)

## Technical Notes

### Why Two Approaches?

The fix uses two complementary approaches:

1. **Positive Updates:** First UPDATE adds/maintains streaks for qualifying players
2. **Negative Updates:** Second UPDATE removes streaks from non-qualifying players

This ensures complete coverage - every player either gets their correct streak set (>0) or reset (0).

### Performance Considerations

The additional UPDATE adds minimal overhead:
- Only runs when games are completed (infrequent operation)
- Uses indexed columns (`current_streak`, `player_id`)
- Filters to only update players with `current_streak > 0` (small subset)

### Future Improvements

Consider adding logging to track when streaks are reset:
```sql
-- Could add a streak_history table to track all changes
INSERT INTO streak_history (player_id, old_streak, new_streak, changed_at, reason)
VALUES (player_id, old_value, new_value, NOW(), 'Game completion - missed game');
```

## Summary

This fix resolves a critical bug where player streaks were not being reset to 0 when players missed games. The root cause was incomplete trigger logic that only handled players with ongoing streaks, not players whose streaks should end. The fix adds explicit logic to reset streaks for non-qualifying players and includes an immediate recalculation of all player streaks to correct any existing discrepancies.
