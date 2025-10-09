# Reserve XP 40-Game Limit Fix

**Date:** 2025-10-09
**Issue:** Reserve XP was counting all historical games instead of limiting to last 40 games
**Status:** ✅ Fixed

## Problem Description

The documentation stated that reserve XP should only be awarded for reserve appearances within the last 40 games (matching the base XP decay system), but the actual database implementation was counting ALL completed reserve appearances throughout a player's entire history.

### Documentation vs. Reality

**Documentation (XPSystemExplained.md):**
> "Being a reserve earns you +5 XP for each game **in the last 40 games**"

**Actual Implementation:**
```sql
-- OLD: No limit on reserve games
SELECT COUNT(*) * 5
FROM game_registrations gr
JOIN games g ON g.id = gr.game_id
WHERE gr.player_id = p_player_id
AND gr.status = 'reserve'
AND g.completed = true
```

This created an unfair advantage for long-time players who had been reserves many times throughout history, as they would accumulate unlimited reserve XP bonuses.

## Impact Assessment

At the time of the fix:
- **Total completed games:** 67
- **40-game window:** Games 28-67 (games before #28 should not count)
- **Reserve appearances beyond 40 games:** 0 (no players affected yet)

While no players were currently affected by this bug, it would have become a significant issue as the league continues and players accumulate reserve appearances beyond the 40-game window.

## Solution

Updated both the `calculate_player_xp()` function and the `player_xp_breakdown` view to properly limit reserve XP to the last 40 games.

### 1. Updated `calculate_player_xp()` Function

```sql
-- NEW: Only count reserve games within last 40 games
WITH reserve_games AS (
    SELECT
        g.sequence_number,
        (v_latest_game_number - g.sequence_number) as games_ago
    FROM game_registrations gr
    JOIN games g ON g.id = gr.game_id
    WHERE gr.player_id = p_player_id
    AND gr.status = 'reserve'
    AND g.completed = true
    AND (gr.late_reserve = false OR gr.late_reserve IS NULL)
)
SELECT COALESCE(COUNT(*) * 5, 0)
INTO v_reserve_xp
FROM reserve_games
WHERE games_ago < 40;  -- Only count reserve games within last 40 games
```

### 2. Updated `player_xp_breakdown` View

```sql
-- NEW: Added 40-game window check and late_reserve exclusion
COUNT(
    CASE
        WHEN (
            gr.status = 'reserve'
            AND g.completed = true
            AND g.is_historical = true
            AND (lg.latest_sequence - g.sequence_number) < 40  -- Only last 40 games
            AND (gr.late_reserve = false OR gr.late_reserve IS NULL)  -- Exclude late reserves
        ) THEN 1
        ELSE NULL
    END
) AS reserve_games
```

## Testing

Verified the fix with multiple queries:

1. **No historical reserves beyond 40 games:**
   - Confirmed no reserve appearances exist before game #28

2. **All reserve counts now respect 40-game window:**
   - Maximum reserve appearances: 3 (Jimmy, Aaron)
   - All within the last 40 games

3. **XP recalculation successful:**
   - All players' XP recalculated on 2025-10-09 10:13:14 UTC
   - View and function now return consistent values

## Files Changed

1. **Database Migration:** `fix_reserve_xp_40_game_limit.sql`
   - Updated `calculate_player_xp()` function

2. **Database Migration:** `update_player_xp_breakdown_view_40_game_limit.sql`
   - Updated `player_xp_breakdown` view

3. **Documentation:** This file

## Related Documentation

- [XP System Explained](../XPSystemExplained.md)
- [XPBreakdown Component](../components/XPBreakdown.md)
- [Player XP Breakdown View](../database/PlayerXPBreakdownView.md)

## Prevention

This issue was caught through careful review of documentation versus implementation. Key lessons:

1. ✅ Always verify database implementations match documented behavior
2. ✅ Use consistent decay patterns across all XP sources
3. ✅ Test with edge cases (players with 40+ game histories)
4. ✅ Document the reasoning behind magic numbers (like 40-game window)

## Future Considerations

As the league grows and games exceed 40+, this fix will become increasingly important. Without it:
- A player with 50 reserve appearances would have gotten 250 XP instead of 200 XP
- The disparity would only grow larger over time
- New players would be at a disadvantage compared to veterans
