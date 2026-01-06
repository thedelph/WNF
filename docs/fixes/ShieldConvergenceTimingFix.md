# Shield Convergence Timing Fix

## Date
January 6, 2026

## Problem
Shield tokens used for the current game were being incorrectly removed when registration closed.

### Example Scenario
1. James H has a 15-game streak
2. James H uses shield token for WNF #78 (upcoming game)
3. Registration closes, `process_shield_streak_protection()` runs
4. Function checks: `current_streak (15) >= convergence_point (8)`
5. Shield is REMOVED - but James H hasn't even missed the game yet!

### Expected Behavior
- Shields used for the CURRENT game should NOT be evaluated for convergence
- Convergence should only apply to shields from PREVIOUS games where the player has returned and started playing again

## Root Cause
The `process_shield_streak_protection()` function was evaluating ALL active shields for convergence, including shields that were just used for the CURRENT game.

The convergence formula `current_streak >= CEIL(protected_streak / 2)` makes sense for players who:
1. Used a shield for a past game
2. Have since returned and played games
3. Are building their natural streak back up

But it makes NO sense for players who:
1. Just used a shield for THIS game
2. Haven't even missed the game yet
3. Still have their original streak intact

## Solution
Modified `process_shield_streak_protection()` to skip shields where `shield_game_id = p_game_id`:

```sql
-- Process players with active shields who used their shield for a PREVIOUS game
-- (NOT this current game - they haven't missed it yet!)
FOR v_player IN
    SELECT
        p.id,
        p.friendly_name,
        p.shield_active,
        p.protected_streak_value,
        p.current_streak,
        stu.game_id as shield_game_id
    FROM players p
    LEFT JOIN shield_token_usage stu ON p.id = stu.player_id AND stu.is_active = true
    WHERE p.shield_active = true
    -- CRITICAL FIX: Only evaluate shields from PREVIOUS games
    -- Skip if player's active shield is for THIS game (p_game_id)
    AND (stu.game_id IS NULL OR stu.game_id != p_game_id)
LOOP
    -- Convergence evaluation logic...
END LOOP;
```

The function now has three distinct handling paths:

1. **Shields from previous games (player returned)**: Evaluate convergence normally
2. **Shields from previous games (player missed another game)**: Remove protection (didn't use new shield)
3. **Shields for current game**: Skip entirely - just report "shield active for this game"

## Files Changed
- `supabase/migrations/20260106_fix_shield_convergence_timing.sql`

## Testing Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Player uses shield for current game | Shield maintained, no convergence check |
| Player with shield from previous game plays again | Convergence evaluated, shield removed if converged |
| Player with shield from previous game misses without new shield | Shield broken |

## Related
- [Shield Token System](../ShieldTokenSystem.md) - Full shield token documentation
- `dropout_with_shield()` function - New dropout functionality added same session
