# Duplicate XP Trigger Fix

**Date:** January 8, 2026
**Migration:** `20260108_remove_duplicate_xp_trigger.sql`
**Status:** ✅ Fixed

---

## Issue

Player rank shields on the Player List page (`/players`) displayed incorrect ranks that didn't match the XP-sorted order.

**Example:** Players sorted by XP showed ranks like `1, 2, 3, 4, 5, 6, 7, 10, 9, 12, 8...` instead of sequential `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11...`

---

## Root Cause

**Two triggers** were firing on game completion:

| Trigger | Function | Updates XP | Updates Ranks |
|---------|----------|-----------|---------------|
| `trigger_xp_v2_on_game_complete` | `recalculate_all_player_xp_v2()` | ✅ All players | ✅ Yes |
| `update_player_xp_on_game_completion` | `update_player_xp()` | ⚠️ Participants only | ❌ **No** |

When a game completed:
1. Both triggers fired (order unpredictable)
2. `recalculate_all_player_xp_v2()` would calculate XP and ranks correctly
3. `update_player_xp()` would then run and update XP for game participants
4. **Result:** XP values changed AFTER ranks were calculated, causing desync

---

## Discovery

The issue was discovered on January 8, 2026 - the first game after players began using shield tokens. Investigation revealed:

- 17 out of 30 top players had mismatched ranks
- Players who used shields (Jack G, James H, Joe) had ranks from BEFORE using their shields
- Database showed `last_calculated` timestamp was recent, but ranks were wrong

---

## Solution

### Immediate Fix
Ran `recalculate_all_player_xp_v2()` to correct all ranks immediately.

### Permanent Fix
Created migration `20260108_remove_duplicate_xp_trigger.sql`:

```sql
-- Drop the duplicate trigger that doesn't update ranks
DROP TRIGGER IF EXISTS update_player_xp_on_game_completion ON games;
```

The `trigger_xp_v2_on_game_complete` trigger remains as the single source of truth for XP/rank/rarity updates.

---

## Technical Details

### Why the Duplicate Trigger Existed
The `update_player_xp_on_game_completion` trigger was likely created:
- Via Supabase dashboard (not in migration files)
- As a hotfix before XP v2 was implemented
- It was not properly deactivated during the v1→v2 migration

### Current Trigger Architecture
After the fix, only these XP-related triggers exist on the `games` table:

| Trigger | Purpose |
|---------|---------|
| `trigger_xp_v2_on_game_complete` | Main XP/rank/rarity recalculation |
| `game_completion_reserve_xp_trigger` | Reserve XP handling |
| `game_deletion_xp_update` | XP cleanup on game deletion |

### Verification Query
To verify ranks match XP order:
```sql
SELECT
  p.friendly_name, px.xp, px.rank,
  ROW_NUMBER() OVER (ORDER BY px.xp DESC) as expected_rank,
  CASE WHEN px.rank = ROW_NUMBER() OVER (ORDER BY px.xp DESC)
       THEN 'OK' ELSE 'MISMATCH' END as status
FROM players p
JOIN player_xp px ON p.id = px.player_id
WHERE px.xp > 0
ORDER BY px.xp DESC;
```
All rows should show "OK" status.

---

## Impact

- **Players affected:** All players with XP > 0
- **Data loss:** None (XP values were correct, only ranks were stale)
- **Downtime:** None
- **User action required:** None (refresh page to see correct ranks)

---

## Prevention

To prevent similar issues:
1. **Single source of truth:** XP/rank updates should go through ONE trigger only
2. **Migration review:** When creating new systems, audit and deactivate old triggers
3. **Testing:** Verify rank order matches XP order after game completion

---

## Related Documentation

- [XP System v2](../features/XPSystemv2.md)
- [XP v1 to v2 Migration](../migrations/XPv1ToV2Migration.md)
- [XP System v1 (Legacy)](../XPSystemExplained.md)
