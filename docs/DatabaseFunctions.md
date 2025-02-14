# Database Functions Documentation

## Overview
This document provides detailed information about the database functions used in the WNF system. Each function is documented with its purpose, parameters, and behavior.

## Token Management Functions

### handle_game_deletion
```sql
handle_game_deletion(p_game_id UUID) RETURNS BOOLEAN
```
Handles the deletion of a game and manages associated token cleanup and reissuance.

**Parameters:**
- `p_game_id`: UUID of the game to delete

**Behavior:**
1. Creates a temporary record of all players who had tokens used in the game
2. Logs token returns in the token history
3. Clears game references from used tokens
4. Deletes all game-related data (selections, registrations, assignments, etc.)
5. Checks affected players for token eligibility
6. Issues new tokens to eligible players who don't have active tokens
7. Refreshes the token status materialized view

**Security:**
- Runs with SECURITY DEFINER to handle materialized view refresh
- Sets search_path to public for security
- Requires authenticated role with appropriate permissions

### enforce_single_active_token
```sql
enforce_single_active_token() RETURNS TRIGGER
```
Trigger function that enforces the rule of one active token per player.

**Behavior:**
1. Allows game deletion operations to proceed (when only used_game_id is being modified)
2. For all other operations, ensures a player cannot have multiple active tokens
3. Raises an exception if the operation would result in multiple active tokens

### check_for_active_tokens
```sql
check_for_active_tokens(p_player_id UUID, p_token_id UUID) RETURNS BOOLEAN
```
Helper function to check if a player has any active tokens besides the specified token.

**Parameters:**
- `p_player_id`: UUID of the player to check
- `p_token_id`: UUID of the token to exclude from the check (can be NULL)

**Returns:**
- TRUE if the player has any other active tokens
- FALSE if the player has no other active tokens

## Game Management Functions

### delete_game_and_update_streaks
```sql
delete_game_and_update_streaks(p_game_id uuid)
```
Safely deletes a game and updates related player streaks while handling various database constraints and triggers.

**Parameters:**
- `p_game_id`: UUID of the game to delete

**Functionality:**
1. Stores list of affected players for streak recalculation
2. Cleans up related `registration_locks` entries
3. Temporarily disables game deletion triggers to prevent recursion:
   - `game_deletion_stats_update`
   - `game_deletion_update`
   - `on_game_deletion`
   - `trigger_game_deletion`
   - `game_deletion_xp_update`
   - `game_streaks_update`
4. Deletes the game
5. Re-enables all triggers
6. Updates streaks for all affected players

**Error Handling:**
- Ensures triggers are re-enabled even if an error occurs during deletion
- Maintains referential integrity by handling foreign key constraints

**Security:**
- Uses `SECURITY DEFINER` to ensure proper permissions
- Sets search path to public for security

## Token History
All token operations are logged in the token_history table with the following actions:
- `token_created`: New token issued
- `token_used`: Token consumed for a game
- `token_returned`: Token returned (game deleted/cancelled/player dropped)
- `token_forgiven`: Token not consumed due to merit selection
- `token_expired`: Token expired without use
- `token_revoked`: Token manually revoked by admin

## Common Usage Patterns

### Game Deletion Example
```sql
-- Delete a game and handle token cleanup
SELECT handle_game_deletion('game_uuid');
```

### Token History Query Example
```sql
-- View token history for a specific game
SELECT * FROM get_token_history(p_game_id := 'game_uuid');
```

## Error Handling
Functions include comprehensive error handling for common scenarios:
- Invalid game IDs
- Permission issues
- Token state conflicts
- Database constraint violations

## Best Practices
1. Always use the provided functions rather than direct table manipulation
2. Monitor token_history for audit purposes
3. Use appropriate error handling when calling these functions
4. Consider transaction boundaries when making multiple related changes
