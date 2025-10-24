# Selection Odds Token Counting Fix

**Date:** 2025-10-24
**Issue:** Players showing as "At Risk" when they should be "Guaranteed"
**Status:** ✅ Fixed

## Problem Description

The registered players page was incorrectly showing players as "At Risk" for selection when mathematical calculation proved they should be "Guaranteed" to be selected.

### Example Case
- **Player:** Dom
- **Position:** 10th by XP (392 XP) among 16 registered players
- **Game Config:** 18 max players, 2 random slots, 16 merit slots
- **Threats:**
  - 3 unregistered players with higher XP (Stephen: 989, Calvin: 615, Zhao: 576)
  - 1 unregistered eligible token holder (Mike M: 127 XP)

**Expected Classification:** Guaranteed
**Actual Classification:** At Risk ❌

### Mathematical Proof
```
wouldBeAtPosition = currentIndex + higherXPUnregistered
                  = 9 + 3 = 12

effectiveXpSlots = xpSlots - unregisteredTokenHoldersCount
                 = 16 - 1 = 15

Comparison: 12 < 15 ✓ TRUE → Should be GUARANTEED
```

Even in worst-case scenario (all 3 higher-XP players register + Mike M uses token), Dom would be at position 12 out of 15 available merit slots.

## Root Cause

The `get_eligible_token_holders_not_in_game` RPC function did not exist in the database, causing the selection odds calculator to receive incorrect data about unregistered token holders.

### Data Flow Issue
1. `useGameRegistrationStats` hook attempted to call non-existent RPC function
2. Fallback logic existed but may have failed silently or timed out when checking eligibility for each token holder individually
3. `unregisteredTokenHoldersCount` defaulted to `0` instead of the correct value (`1`)
4. Selection odds calculator used incorrect threat assessment
5. Players incorrectly classified as "At Risk"

## Solution Implemented

### 1. Created Missing RPC Function
**File:** `supabase/migrations/20251024_create_get_eligible_token_holders_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION get_eligible_token_holders_not_in_game(p_game_id UUID)
RETURNS TABLE (
  player_id UUID,
  friendly_name TEXT,
  xp INTEGER,
  token_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.player_id,
    ps.friendly_name,
    ps.xp,
    pt.id as token_id
  FROM player_tokens pt
  JOIN player_stats ps ON pt.player_id = ps.id
  WHERE pt.used_at IS NULL
    AND (pt.expires_at IS NULL OR pt.expires_at > NOW())
    AND pt.player_id NOT IN (
      SELECT gr.player_id
      FROM game_registrations gr
      WHERE gr.game_id = p_game_id
    )
    AND check_token_eligibility(pt.player_id) = TRUE
  ORDER BY ps.xp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Benefits:**
- Single database query instead of N+1 loop (one per token holder)
- Properly filters by eligibility using existing `check_token_eligibility()` function
- Returns structured data including player XP for debugging
- Much faster than client-side fallback logic

### 2. Verified Hook Integration
The existing hook code at `src/hooks/useGameRegistrationStats.ts` (lines 133-160) already had the correct call structure and fallback logic - it was just waiting for the RPC function to exist.

## Testing

### Verification Steps
1. Created RPC function via migration
2. Tested function directly: `SELECT * FROM get_eligible_token_holders_not_in_game('<game_id>')`
3. Confirmed returns Mike M as only eligible token holder
4. Loaded registered players page for game #70
5. Verified Dom now shows as "Guaranteed" ✅

### Test Query Result
```sql
-- Returns 1 row (Mike M with available token)
SELECT * FROM get_eligible_token_holders_not_in_game('4f224e19-19d3-4dab-973c-11b1582fcfc7');

-- Result:
-- player_id: 5c0e1219-9355-4078-b76d-a63ec320969c
-- friendly_name: Mike M
-- xp: 127
-- token_id: b1cc21ea-5d2b-444c-8ac3-96ba50dd7da2
```

## Impact

### Before Fix
- Incorrect "At Risk" warnings causing player confusion
- Players might unnecessarily use priority tokens thinking they need them
- Undermines trust in selection odds system

### After Fix
- Accurate "Guaranteed" status for players safely in merit zone
- Correct threat assessment from unregistered token holders
- More reliable selection odds calculator

## Files Modified

1. **Created:** `supabase/migrations/20251024_create_get_eligible_token_holders_rpc.sql`
   - New RPC function for efficient token holder counting

2. **No Changes Required:**
   - `src/hooks/useGameRegistrationStats.ts` - Already had correct call structure
   - `src/utils/selectionOdds.ts` - Logic was correct, just needed accurate input data

## Related Documentation

- `/docs/PlayerSelectionExplained.md` - Player selection process overview
- `/docs/components/RegisteredPlayers.md` - Registered players component documentation
- `/docs/TokenSystem.md` - Priority token system documentation

## Prevention

To prevent similar issues in the future:
1. When creating new features that reference RPC functions, ensure functions exist before deploying frontend code
2. Add better error logging for RPC call failures (not just silent fallbacks)
3. Consider adding integration tests for critical data flow paths like selection odds

## Notes

- The selection odds algorithm logic in `selectionOdds.ts` was mathematically correct
- The fallback logic in `useGameRegistrationStats.ts` was theoretically correct but inefficient
- Creating the RPC function makes the system both correct AND performant
- No changes needed to frontend logic - it was designed correctly from the start
