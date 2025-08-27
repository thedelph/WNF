# Orphaned Game Registrations Fix

## Issue Date
2025-08-22

## Problem Description
Multiple players were incorrectly showing as having unpaid games on the Token Management page (`/admin/tokens`). The issue affected 18 players who each showed "Has 2 unpaid game(s)" despite having no actual unpaid games visible in the payment system.

### Affected Players
Alex E, Anthony B, Chris H, Daniel, Darren W, Dave, Dom, Jack G, James H, Jarman, Lewis Simons mate, Luke, Nathan, Paul, Phil R, Simon, Stephen, and Tom K

## Root Cause
The database contained orphaned game registrations - records in the `game_registrations` table that referenced games that no longer existed in the `games` table. These phantom registrations had:
- `status = 'selected'`
- `paid = false`
- Referenced non-existent game IDs:
  - `43f6c9af-d63b-46f2-a5e4-0db6ba95ffa6`
  - `e52a1fa9-99bf-4fd6-aca0-2c322974fcea`

The Token Management page correctly counted these as unpaid games, but they couldn't be viewed or managed through the UI since the associated games didn't exist.

## How It Was Discovered
The issue was identified when querying the database directly:
1. The TokenManagement.tsx query (`status = 'selected' AND paid = false`) found 36 unpaid registrations
2. When joining with the games table, these registrations had NULL game references
3. This indicated orphaned records from games that were deleted without properly cleaning up their registrations

## Solution Implemented
Applied migration `fix_orphaned_game_registrations` that:

1. **Deleted all orphaned registrations**: Removed 36 registration records that pointed to non-existent games
2. **Added foreign key constraint with CASCADE DELETE**: 
   - Dropped the existing `game_registrations_game_id_fkey` constraint
   - Added a new constraint with `ON DELETE CASCADE`
   - This ensures that when a game is deleted, all associated registrations are automatically deleted

## SQL Migration
```sql
-- Delete all orphaned game registrations
DELETE FROM game_registrations gr
WHERE NOT EXISTS (
    SELECT 1 FROM games g WHERE g.id = gr.game_id
);

-- Add foreign key constraint with CASCADE DELETE
ALTER TABLE game_registrations 
DROP CONSTRAINT IF EXISTS game_registrations_game_id_fkey;

ALTER TABLE game_registrations
ADD CONSTRAINT game_registrations_game_id_fkey 
FOREIGN KEY (game_id) 
REFERENCES games(id) 
ON DELETE CASCADE;
```

## Prevention
The new foreign key constraint with `CASCADE DELETE` prevents this issue from recurring. When a game is deleted in the future, all associated registrations will be automatically removed, maintaining referential integrity.

## Verification
After applying the fix:
- All 18 affected players no longer show unpaid games (unless they have legitimate unpaid games)
- The Token Management page correctly displays token eligibility
- No orphaned registrations remain in the database

## Related Files
- `/src/pages/admin/TokenManagement.tsx` - Token management page that revealed the issue
- `/supabase/migrations/fix_orphaned_game_registrations.sql` - Migration that fixed the issue