# Bench Warmer Streak Calculation Fix

**Date:** 2025-10-31
**Issue:** `calculate_bench_warmer_streak` function returned 1/0 instead of counting consecutive reserve appearances
**Status:** ✅ Fixed

## Problem Description

The selection odds calculator was showing incorrect percentages for players in the random selection zone because the `calculate_bench_warmer_streak` database function was fundamentally broken.

### Example Case: WNF Game #71

**Player:** Jimmy
**Position:** 19th by XP (competing for 2 random slots)
**Recent Game History:**
- Oct 29 (Game #70): **reserve**
- Oct 22 (Game #69): **reserve**
- Oct 15 (Game #68): **selected** ← Breaks the streak

**Expected:** `bench_warmer_streak = 2` (two consecutive reserve appearances)
**Actual:** `bench_warmer_streak = 1` ❌

### Impact on Selection Odds

With 3 players competing for 2 random slots:
- Michael D: 205 XP, streak 0 → 1 point
- Jude: 184 XP, streak 1 → 2 points
- Jimmy: 107 XP, streak should be 2 → should have 3 points

**Incorrect Odds (streak = 1):**
- Jimmy: 77% (2 points out of 5 total)
- Jude: 77% (2 points out of 5 total)
- Michael D: 47% (1 point out of 5 total)

**Correct Odds (streak = 2):**
- Jimmy: **85%** (3 points out of 6 total)
- Jude: **65%** (2 points out of 6 total)
- Michael D: **38%** (1 point out of 6 total)

Jimmy's odds were understated by 8 percentage points, while Jude's were overstated by 12 points.

## Root Cause

The `calculate_bench_warmer_streak` function had fundamentally incorrect logic:

```sql
-- BROKEN LOGIC (before fix)
RETURN (
    CASE WHEN EXISTS (
        SELECT 1
        FROM game_registrations gr
        JOIN LastCompletedGame lcg ON gr.game_id = lcg.id
        WHERE gr.player_id = player_uuid
        AND gr.status = 'reserve'
    ) THEN 1
    ELSE 0
    END
);
```

This function:
1. Only checked if the player was reserve in the **most recent** completed game
2. Returned **1** if yes, **0** if no
3. **Never counted** consecutive games

### Why This Was Wrong

The function name and purpose is `calculate_bench_warmer_**streak**` - it should count consecutive reserve appearances, not just check if someone was reserve recently.

**Expected behavior:**
- 2 consecutive reserve games → return 2
- 1 reserve game → return 1
- 0 reserve games → return 0

**Actual behavior:**
- Reserve in last game → return 1
- Not reserve in last game → return 0

## Solution Implemented

### 1. Rewrote calculate_bench_warmer_streak Function

**File:** `supabase/migrations/20251031_fix_bench_warmer_streak_calculation.sql`

The corrected function now:
1. Finds all completed games where player was reserve
2. Counts consecutive games from most recent backward
3. Stops counting when hitting a game where player was NOT reserve or didn't register
4. Returns the actual count

**Correct Logic:**
```sql
WITH completed_games AS (
    SELECT id, sequence_number
    FROM games
    WHERE completed = true
),
player_reserve_games AS (
    SELECT g.sequence_number
    FROM game_registrations gr
    JOIN completed_games g ON gr.game_id = g.id
    WHERE gr.player_id = player_uuid
    AND gr.status = 'reserve'
),
consecutive_reserve_streak AS (
    -- Count consecutive reserve games from most recent backward
    -- Only count games where there's NO LATER completed game where they were NOT reserve
    SELECT COUNT(*) as streak
    FROM player_reserve_games prg
    WHERE NOT EXISTS (
        SELECT 1
        FROM completed_games cg
        LEFT JOIN game_registrations gr ON gr.game_id = cg.id AND gr.player_id = player_uuid
        WHERE cg.sequence_number > prg.sequence_number
        AND (gr.id IS NULL OR gr.status != 'reserve')
    )
)
SELECT COALESCE(streak, 0)
FROM consecutive_reserve_streak
```

### 2. Recalculated All Player Streaks

The migration includes:
```sql
UPDATE players
SET bench_warmer_streak = calculate_bench_warmer_streak(id)
WHERE id IS NOT NULL;
```

This ensures all existing incorrect values are fixed.

## Testing & Verification

### Before Fix
```sql
SELECT friendly_name, bench_warmer_streak
FROM players p
JOIN player_stats ps ON p.id = ps.id
WHERE ps.friendly_name IN ('Jimmy', 'Jude', 'Michael D');

-- Results:
-- Jimmy: 1 ❌ (should be 2)
-- Jude: 1 ✓
-- Michael D: 0 ✓
```

### After Fix
```sql
SELECT friendly_name, bench_warmer_streak
FROM players p
JOIN player_stats ps ON p.id = ps.id
WHERE ps.friendly_name IN ('Jimmy', 'Jude', 'Michael D');

-- Results:
-- Jimmy: 2 ✓ (corrected!)
-- Jude: 1 ✓
-- Michael D: 0 ✓
```

### Selection Odds Update

The frontend automatically reflects the corrected odds on next page load:
- No code changes needed in `src/utils/selectionOdds.ts`
- No changes needed in `src/components/game/RegisteredPlayers.tsx`
- Values automatically pulled from database via `useGameRegistrationStats` hook

## Impact

### Before Fix
- Players with multiple consecutive reserve games only counted as having 1 game
- Selection odds understated their actual chances
- Created unfair perception that streak bonuses weren't working
- Players might use priority tokens unnecessarily thinking they had lower odds

### After Fix
- Accurate streak counting for all players
- Correct selection odds calculation
- Fair representation of loyalty bonus system
- Players can trust the displayed percentages

## Related Documentation

- `/docs/components/RegisteredPlayers.md` - Selection odds display component
- `/docs/utils/selectionOdds.ts` - Selection odds calculation algorithm
- `/docs/PlayerSelectionExplained.md` - Player selection process overview
- `/docs/fixes/SelectionOddsTokenCountingFix.md` - Previous odds calculation fix

## Related Database Objects

- **Function:** `calculate_bench_warmer_streak(player_uuid UUID)` - Fixed in this migration
- **Function:** `calculate_player_streak(player_uuid UUID)` - Similar logic for selected streaks (works correctly)
- **Trigger:** `update_streaks_on_game_change()` - Calls both streak functions when games complete
- **Column:** `players.bench_warmer_streak` - Stores the calculated streak value

## Prevention

To prevent similar issues in the future:

1. **Function Testing:** When creating streak/count functions, test with players who have multiple consecutive occurrences, not just 0 or 1
2. **Naming Clarity:** Functions named `calculate_*_streak` should always count consecutive occurrences, never return binary values
3. **Code Review:** Database functions affecting game selection should be reviewed carefully for edge cases
4. **Integration Tests:** Consider adding tests that verify streak calculations match expected manual counts

## Notes

- The fix only required changes to the database function - no TypeScript code changes needed
- The `update_streaks_on_game_change()` trigger was already correct and calling the function properly
- The frontend hook `useGameRegistrationStats` already fetched the value correctly from the database
- The bug existed since the function was created and affected all historical calculations
- The recalculation in the migration fixed all historical incorrect values
