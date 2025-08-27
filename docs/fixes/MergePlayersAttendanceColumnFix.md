# Merge Players Attendance Column Fix

## Date
2025-01-25

## Issue Description
The `merge_players` function was failing with the error:
```
column "attendance_confirmed" does not exist
```

This occurred when attempting to merge duplicate player accounts (specifically when merging test user Zhao with real user Zhao).

## Example Case
- **Source Player**: Test user Zhao (marked as test user)
- **Target Player**: Real Zhao (ID: 5b2e40bd-1bbb-4533-82c3-cdb0276b5399)
- **Error**: 400 Bad Request with PostgreSQL error code 42703

## Root Cause
The `merge_players` function was trying to reference an `attendance_confirmed` column in the `game_registrations` table that doesn't exist. This column was likely removed in a previous migration or never existed in the production schema, but the merge function wasn't updated to reflect this change.

The problematic code was in the game registrations handling section:
```sql
FOR v_game_reg IN (
    SELECT game_id, status, paid, team, attendance_confirmed,  -- Column doesn't exist
           paid_by_player_id, payment_recipient_id
    FROM game_registrations
    WHERE player_id = source_player_id
) LOOP
```

## Impact
- All player merge operations were failing
- Duplicate accounts couldn't be consolidated
- Test users couldn't be merged with their real counterparts

## Fix Applied
Created migration `20250125150000_fix_merge_players_attendance_column.sql` that:

1. Dropped the existing broken function
2. Recreated the function without the `attendance_confirmed` column reference
3. Maintained all other functionality including:
   - Proper handling of all related tables (player_ratings_history, payment_presets, etc.)
   - Conflict resolution for duplicate ratings and game registrations
   - Token history foreign key constraints

Key change:
```sql
-- Before (line 186)
SELECT game_id, status, paid, team, attendance_confirmed,
       paid_by_player_id, payment_recipient_id

-- After
SELECT game_id, status, paid, team,
       paid_by_player_id, payment_recipient_id
```

## Prevention
1. **Schema Validation**: Before updating database functions, verify all referenced columns exist
2. **Testing**: Test merge operations in development after any schema changes
3. **Documentation**: Keep function dependencies documented when columns are added/removed

## Verification
After applying the fix:
1. Successfully merged test user Zhao with real user Zhao
2. Verified only one Zhao player remains (ID: 5b2e40bd-1bbb-4533-82c3-cdb0276b5399)
3. Confirmed 38 game registrations were preserved
4. Verified XP (360) and caps (36) were correctly maintained

## Technical Notes
- The `game_registrations` table has 17 columns, none of which is `attendance_confirmed`
- This fix also addressed an earlier migration (`20250725145520_fix_merge_players_function.sql`) that had the same issue
- The function now properly handles all current tables in the schema including recent additions like `player_ratings_history` and `player_rating_audit`