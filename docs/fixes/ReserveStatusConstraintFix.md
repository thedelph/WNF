# Reserve Status Database Constraint Fix

## Issue
When attempting to add a player with status "Reserve - No Slot Offer" in the Game Completion Form, the operation failed with the following error:
```
Error adding player: 
code: "23514"
message: "new row for relation \"game_registrations\" violates check constraint \"game_registrations_status_check\""
```

## Root Cause
The `game_registrations` table has a check constraint that only allows these status values:
- `registered`
- `selected`
- `reserve`
- `dropped_out`

The code was attempting to use `reserve_no_offer` which is not in the allowed list.

## Solution
1. Changed all references from `reserve_no_offer` to `reserve` throughout the codebase
2. The distinction between reserves who received offers and those who didn't is handled through the separate `slot_offers` table
3. For UI purposes, "Reserve - Declined Slot" is transformed to `reserve` status when stored in the database

## Files Modified
1. **src/components/admin/history/PlayerSearch.tsx**
   - Changed dropdown option value from `reserve_no_offer` to `reserve`
   - Updated status change recording to use `reserve` as from_status

2. **src/components/admin/history/GameCompletionForm.tsx**
   - Updated status change recording to use `reserve` instead of `reserve_no_offer`
   - Simplified status mapping logic during game completion

3. **src/components/admin/history/types.ts**
   - Updated PlayerStatus type to use `reserve` instead of `reserve_no_offer`

4. **src/components/admin/history/StatusChangeForm.tsx**
   - Updated condition check from `reserve_no_offer` to `reserve`

## Database Design Pattern
- The `game_registrations` table uses simple status values
- Complex status tracking (like slot offers) is handled in separate tables
- This maintains referential integrity while allowing flexible business logic

## Prevention
- Always check database constraints before implementing new status values
- Use the Supabase MCP tools to verify table schemas and constraints
- Consider adding TypeScript types that match database constraints exactly