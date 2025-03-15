# Token System Fix Documentation

## Issue: Tokens Not Returned on Game Deletion

### Problem Description
When games were deleted, player tokens were not being properly returned to players. Specifically:

1. The system was only clearing the `used_game_id` field but not resetting the `used_at` timestamp
2. This resulted in tokens appearing as "used" but not associated with any game
3. Players like Mike M could not use their tokens even after games were deleted
4. The token eligibility check was failing because `used_at` was still set

### Root Cause Analysis
The issue was found in multiple functions that handle game deletion:

1. In `handle_game_deletion()` (trigger function):
   - Only `used_game_id` was being reset to NULL
   - `used_at` remained set, keeping the token in a "used" state

2. In `delete_game()` function:
   - Similar issue where only `used_game_id` was being reset
   - `used_at` field was not being modified

3. In `delete_game_and_update_streaks()` function:
   - No token handling was implemented at all

### Solution Implemented

The following changes were made to fix the issue:

1. Updated `handle_game_deletion()` (trigger function):
   ```sql
   UPDATE player_tokens
   SET used_game_id = NULL, 
       used_at = NULL
   WHERE used_game_id = OLD.id;
   ```

2. Updated `delete_game()` function:
   ```sql
   UPDATE player_tokens 
   SET used_game_id = NULL, used_at = NULL 
   WHERE used_game_id = p_game_id;
   ```

3. Updated `delete_game_and_update_streaks()` function:
   ```sql
   -- Return tokens by setting both used_game_id AND used_at to NULL
   UPDATE player_tokens
   SET used_game_id = NULL,
       used_at = NULL
   WHERE used_game_id = p_game_id;
   ```

4. Added a refresh of the materialized view to ensure token status is updated:
   ```sql
   -- Refresh the materialized view to reflect token changes
   REFRESH MATERIALIZED VIEW public_player_token_status;
   ```

### Verification
The fix was verified by:
1. Resetting Mike M's token to an available state
2. Confirming the token could be used for game registration
3. Deleting the game
4. Verifying the token was properly returned and could be used again

### Documentation Updates
The TokenSystem.md documentation was updated to explicitly state that both `used_game_id` AND `used_at` are set to NULL when a game is deleted, ensuring tokens are properly returned to players.

### Future Considerations
To prevent similar issues in the future:
1. Always consider both `used_game_id` and `used_at` fields when implementing token-related functionality
2. Ensure all functions that handle game deletion properly reset token state
3. Consider adding automated tests for token return scenarios
4. Monitor token usage patterns to detect any anomalies

### Related Components
- `src/hooks/useTokenStatus.ts` - Checks token availability
- `src/components/profile/TokenStatus.tsx` - Displays token status to players
- `src/pages/admin/TokenManagement.tsx` - Admin interface for token management
