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

## User Management Functions

### merge_players
```sql
merge_players(source_player_id UUID, target_player_id UUID) RETURNS BOOLEAN
```
Merges a source player (typically a test user) into a target player (real user), transferring all data and deleting the source player.

**Parameters:**
- `source_player_id`: UUID of the source player (to be merged and deleted)
- `target_player_id`: UUID of the target player (to receive data)

**Behavior:**
1. Updates token_history references to point to the target player
2. Handles token history foreign key constraints before modifying tokens
3. Transfers or marks as used any active tokens from the source player
4. Deletes any remaining tokens from the source player
5. Combines XP from both players
6. Updates all foreign key references from source to target:
   - Game registrations
   - Player ratings (as rated player and as rater)
   - Notifications
   - Player penalties
7. Deletes the source player

**Error Handling:**
- Properly handles foreign key constraints, especially for token_history
- Raises exceptions for debugging
- Returns FALSE if merge fails, TRUE if successful

**Security:**
- Uses SECURITY DEFINER to ensure proper permissions

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

## XP Management Functions

### take_xp_snapshot

**Purpose:**  
Takes a snapshot of all players' current XP values at a point in time (1 hour after the last completed game) for historical record keeping and leaderboard purposes.

**Behavior:**
- Retrieves the date of the most recent completed game
- Sets a timestamp 1 hour after that game (or current time if no games exist)
- Saves current XP, rank, and rarity values for all players to the player_xp_snapshots table
- Returns a message indicating how many players were included in the snapshot

**Returns:**
- Text message showing success status and number of players snapshotted

**Usage Example:**
```sql
-- Take a snapshot of current XP values
SELECT take_xp_snapshot();
```

**Table Structure:**
```sql
CREATE TABLE player_xp_snapshots (
    id BIGSERIAL PRIMARY KEY,
    player_id UUID NOT NULL,
    xp INTEGER NOT NULL,
    xp_v2 INTEGER,           -- v2 equivalent XP (for historical normalization)
    rank INTEGER,
    rarity TEXT,
    snapshot_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Security:**
- Uses SECURITY DEFINER to ensure proper permissions
- Granted to authenticated and service_role roles

### calculate_historical_xp_v2
```sql
calculate_historical_xp_v2(p_player_id UUID, p_as_of_date TIMESTAMPTZ) RETURNS INTEGER
```
Calculates what a player's XP would have been under v2 rules at a historical date. Used to normalize v1-era high scores for fair comparison.

**Parameters:**
- `p_player_id`: UUID of the player
- `p_as_of_date`: The date to calculate XP as of

**Behavior:**
1. Gets all games completed up to the `as_of_date`
2. Calculates base XP using v2 linear decay: `MAX(1, 20 - (games_ago * 0.5))`
3. Reconstructs the player's attendance streak at that date
4. Applies v2 diminishing streak bonus formula
5. Returns the v2 equivalent XP value

**Usage Example:**
```sql
-- Calculate what a player's XP would have been under v2 on a specific date
SELECT calculate_historical_xp_v2(
    'player_uuid',
    '2025-06-15 20:00:00+00'
);
```

## Player Statistics Functions

### get_player_recent_win_rates
```sql
get_player_recent_win_rates(games_threshold INTEGER DEFAULT 10)
```

**Purpose:**  
Calculates the recent win rate for each player based on their most recent games (default: last 10 games).

**Parameters:**
- `games_threshold`: The number of recent games to consider (defaults to 10)

**Behavior:**
1. Identifies all completed games where the player was selected to play
2. Filters to only include balanced games (team sizes differ by at most 1 player)
3. Considers a player's most recent N games (where N is the games_threshold)
4. Calculates the win rate percentage, total games played, and the count of wins/draws/losses
5. Returns results for all players (with 0.0% for those with no recent games)

**Returns:**
A table with columns:
- id (UUID): Player's unique identifier
- recent_win_rate (NUMERIC): Percentage of games won (0-100)
- games_played (BIGINT): Number of recent games considered
- recent_wins (BIGINT): Number of wins in recent games
- recent_draws (BIGINT): Number of draws in recent games
- recent_losses (BIGINT): Number of losses in recent games

**Usage Example:**
```sql
-- Get recent win rates for all players
SELECT * FROM get_player_recent_win_rates();

-- Get recent win rates based on last 5 games
SELECT * FROM get_player_recent_win_rates(5);
```

**Important Note:**
The function uses 'selected' as the player status value to identify games where a player participated (not 'played').

## Database Views

### highest_xp_records_view

**Purpose:**
Provides a view of the highest XP achieved by each player across all snapshots taken, including v2 equivalent values for historical normalization.

**Behavior:**
- Uses window functions to rank each player's snapshots by XP (highest first)
- Selects only the top XP record for each player
- Joins with the players table to get friendly names
- Orders results by XP in descending order
- Includes v2 equivalent XP and era indicator for normalization

**Columns:**
- player_id (UUID): Unique identifier for the player
- friendly_name (TEXT): Player's friendly name from the players table
- xp (INTEGER): The highest XP value achieved by the player (v1 value)
- xp_v2 (INTEGER): The v2 equivalent XP value for fair comparison
- rank (INTEGER): The player's rank at the time of the snapshot
- rarity (TEXT): The player's rarity at the time of the snapshot
- snapshot_date (TIMESTAMPTZ): When the XP value was recorded
- is_v1_era (BOOLEAN): True if snapshot is from before January 2026

**Usage Example:**
```sql
-- Get the top 10 highest XP records (sorted by v1 XP)
SELECT * FROM highest_xp_records_view LIMIT 10;

-- Get highest XP records for a specific year
SELECT * FROM highest_xp_records_view
WHERE EXTRACT(YEAR FROM snapshot_date) = 2025
ORDER BY xp DESC LIMIT 10;

-- Get all-time highest by v2 equivalent (for fair cross-era comparison)
SELECT * FROM highest_xp_records_view
ORDER BY xp_v2 DESC LIMIT 10;
```

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

### Merging Users Example
```sql
-- Merge a test user into a real user
SELECT merge_players('test_user_uuid', 'real_user_uuid');
```

## Error Handling
Functions include comprehensive error handling for common scenarios:
- Invalid game IDs
- Permission issues
- Token state conflicts
- Database constraint violations
- Foreign key constraints, especially in complex operations like user merging

## Best Practices
1. Always use the provided functions rather than direct table manipulation
2. Monitor token_history for audit purposes
3. Use appropriate error handling when calling these functions
4. Consider transaction boundaries when making multiple related changes
