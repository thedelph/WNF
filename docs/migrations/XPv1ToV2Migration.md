# XP v1 to v2 Migration Runbook

> **Status**: ✅ **COMPLETED** - January 3, 2026
> **Original Target**: January 2026
> **Actual Duration**: Completed in stages (December 2025 - January 2026)
> **Post-Migration Fix**: player_stats view updated January 3, 2026

---

## Migration Summary

The v1 to v2 migration was completed in stages:

1. **December 2025**: Initial table swap (`player_xp` ↔ `player_xp_v2`)
2. **January 2, 2026**: XP triggers updated to use v2 calculation functions
3. **January 3, 2026**: **Critical fix** - `player_stats` view updated to use `player_xp` instead of `player_xp_legacy`

### Post-Migration Issue Discovered (January 3, 2026)

The `player_stats` view was still pointing to `player_xp_legacy` (v1 XP), causing a discrepancy between:
- **Display** (using `player_xp` directly) → showed v2 XP
- **Selection** (using `player_stats` view) → used v1 XP

This was fixed with migration `fix_player_stats_view_use_v2_xp`.

---

## Original Runbook (For Reference)

## Pre-Migration Checklist

### 2 Weeks Before (December)
- [ ] Announce v2 system change to players via WhatsApp
- [ ] Share the announcement template (see below)
- [ ] Give players time to check `/admin/xp-comparison`
- [ ] Address player questions and concerns

### Week Before
- [ ] Final validation of v2 calculations
- [ ] Document current top 20 rankings for comparison
- [ ] Test rollback procedure on staging (if available)
- [ ] Ensure you have Supabase admin access

### Day Before
- [ ] Verify no games are currently in progress
- [ ] Note the current `player_xp` row count
- [ ] Screenshot current leaderboard for reference

---

## Migration Steps

### Step 1: Backup Current Data

```sql
-- Create backup of current v1 data
CREATE TABLE player_xp_v1_backup AS SELECT * FROM player_xp;

-- Verify backup
SELECT COUNT(*) FROM player_xp_v1_backup;
-- Should match: SELECT COUNT(*) FROM player_xp;
```

### Step 2: Swap Tables

```sql
-- Rename current table to legacy
ALTER TABLE player_xp RENAME TO player_xp_legacy;

-- Promote v2 to be the primary table
ALTER TABLE player_xp_v2 RENAME TO player_xp;
```

### Step 3: Update Triggers

```sql
-- Drop the v2-specific trigger (now redundant)
DROP TRIGGER IF EXISTS trigger_xp_v2_on_game_complete ON games;

-- The original trigger still exists and calls trigger_recalculate_xp_on_game_complete()
-- We need to update it to use the v2 calculation function

-- Option A: Update the existing trigger function to call v2 logic
CREATE OR REPLACE FUNCTION trigger_recalculate_xp_on_game_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        -- Now calls v2 recalculation
        PERFORM recalculate_all_player_xp_v2();
    END IF;
    RETURN NEW;
END;
$function$;

-- Option B: Or simply rename the v2 function
-- (Skip this if using Option A)
-- ALTER FUNCTION calculate_player_xp_v2 RENAME TO calculate_player_xp;
```

### Step 4: Recalculate All XP

```sql
-- Ensure all XP values are fresh
SELECT recalculate_all_player_xp_v2();

-- Verify calculation completed
SELECT COUNT(*) FROM player_xp WHERE last_calculated > NOW() - INTERVAL '5 minutes';
-- Should match total player count
```

### Step 5: Verify Migration

```sql
-- Check top 10 players
SELECT
    p.friendly_name,
    px.xp,
    px.rank,
    px.rarity
FROM player_xp px
JOIN players p ON p.id = px.player_id
ORDER BY px.xp DESC
LIMIT 10;

-- Verify no null or negative values
SELECT COUNT(*) FROM player_xp WHERE xp IS NULL OR xp < 0;
-- Should be 0

-- Check rarity distribution
SELECT rarity, COUNT(*) FROM player_xp GROUP BY rarity ORDER BY COUNT(*) DESC;
```

---

## Post-Migration Verification

### Functional Tests

1. **Player Selection Test**
   - Create a test game registration
   - Verify player XP values appear correctly
   - Check sorting is correct (highest XP first)

2. **Profile Display Test**
   - View a player profile
   - Verify XP breakdown displays
   - Check rarity badge is correct

3. **Leaderboard Test**
   - View stats page
   - Verify ranking order matches expected

### Comparison Check

```sql
-- Compare top 20 with documented pre-migration rankings
-- This is a manual check against your screenshots
SELECT
    p.friendly_name,
    px.xp as new_xp,
    px.rank as new_rank
FROM player_xp px
JOIN players p ON p.id = px.player_id
ORDER BY px.xp DESC
LIMIT 20;
```

---

## Rollback Procedure

If issues arise, execute this rollback within 24 hours:

```sql
-- Step 1: Swap tables back
ALTER TABLE player_xp RENAME TO player_xp_v2_failed;
ALTER TABLE player_xp_legacy RENAME TO player_xp;

-- Step 2: Restore original trigger function
CREATE OR REPLACE FUNCTION trigger_recalculate_xp_on_game_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        PERFORM recalculate_all_player_xp();  -- Back to v1 function
    END IF;
    RETURN NEW;
END;
$function$;

-- Step 3: Verify rollback
SELECT COUNT(*) FROM player_xp;
-- Should match original count
```

---

## Cleanup (30 Days Post-Migration)

Once stable, optionally clean up legacy objects:

```sql
-- Remove backup tables (OPTIONAL - keep if you want history)
-- DROP TABLE player_xp_v1_backup;
-- DROP TABLE player_xp_legacy;

-- Rename v2 functions to remove suffix (OPTIONAL - cosmetic)
-- ALTER FUNCTION calculate_player_xp_v2 RENAME TO calculate_player_xp;
-- ALTER FUNCTION recalculate_all_player_xp_v2 RENAME TO recalculate_all_player_xp;
```

---

## Player Announcement Template

Send this to WhatsApp 2 weeks before migration:

```
XP System Update - Coming January 2026

Hi everyone! We're updating the XP system to be fairer for all players.

What's Changing:
- Streak bonuses will have diminishing returns
  Current: 10% per game (27 games = +270%!)
  New: 10%, 9%, 8%... down to +1% (27 games = +72%)

- Game XP now decays gradually instead of sudden drops
  Current: 20 -> 18 -> 16 -> 14 -> 12 -> 10 -> 5 -> 0
  New: 20 -> 19.5 -> 19 -> ... -> 1 (smoother curve)

What This Means:
- Missing one game won't tank your ranking as much
- Regular players still rewarded, but mega-streaks less dominant
- Fairer competition across all activity levels

Going Live: January 1, 2026

Admins can check the comparison tool to preview changes!
```

---

## Files Reference

### Frontend (No Changes Required)
These files read from `player_xp` table - they'll automatically use v2 after table swap:
- `src/hooks/useGlobalXP.ts`
- `src/hooks/useGameRegistrationStats.ts`
- `src/components/profile/XPBreakdown.tsx`
- `src/utils/playerSelection.ts`

### Documentation to Update Post-Migration
- `docs/XPSystemExplained.md` - Add v1 deprecation notice
- `docs/components/XPBreakdown.md` - Update calculation examples
- `CLAUDE.md` - Update XP weighting table

### Admin Page (Keep for Reference)
- `src/pages/admin/XPComparison.tsx` - Historical comparison view
- `src/components/admin/xp/XPComparisonDashboard.tsx` - Comparison dashboard

---

## Troubleshooting

### Issue: XP values not updating after game completion
**Cause**: Trigger function not updated correctly
**Fix**: Re-run Step 3 to update trigger function

### Issue: Missing players in player_xp table
**Cause**: New players not in v2 table
**Fix**: Run `SELECT recalculate_all_player_xp_v2();` to populate all

### Issue: Frontend shows old values
**Cause**: Browser cache or React Query cache
**Fix**: Clear localStorage and refresh, or wait for 5-minute cache expiry

### Issue: Rarity badges incorrect
**Cause**: Percentile thresholds may need recalculation
**Fix**: Check `recalculate_all_player_xp_v2()` includes rarity update

### Issue: player_stats view using legacy XP (ACTUAL ISSUE - January 3, 2026)
**Symptom**:
- RegisteredPlayers showed players in correct v2 XP order
- Simulation and actual selection used different (v1) XP order
- Players appeared in wrong merit/random sections

**Cause**: The `player_stats` view was not updated during the table swap. It continued to join `player_xp_legacy` instead of `player_xp`.

**Discovery**: Noticed player "Simon" showing in randomiser section in the UI but simulation showed him in merit section.

**Fix Applied**:
```sql
CREATE OR REPLACE VIEW player_stats AS
SELECT p.id,
    p.user_id,
    p.friendly_name,
    p.caps,
    p.active_bonuses,
    p.active_penalties,
    p.win_rate,
    p.attack_rating,
    p.defense_rating,
    p.avatar_svg,
    p.avatar_options,
    p.current_streak,
    p.max_streak,
    COALESCE(px.xp, 0) AS xp
FROM players p
LEFT JOIN player_xp px ON p.id = px.player_id;  -- Changed from player_xp_legacy
```

**Lesson Learned**: When swapping tables, audit ALL views that reference the old table name. The `player_stats` view was a hidden dependency that wasn't in the original migration checklist.

---

## Post-Migration Cleanup Checklist

- [x] player_xp table contains v2 values
- [x] player_xp_legacy contains archived v1 values
- [x] XP triggers use v2 calculation functions
- [x] **player_stats view uses player_xp (not player_xp_legacy)**
- [ ] (Optional) Drop player_xp_legacy after 30 days if not needed
- [ ] (Optional) Rename v2 functions to remove suffix
