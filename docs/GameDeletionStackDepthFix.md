# Game Deletion Stack Depth Fix

## Issue

When attempting to delete a game from the admin interface, users were encountering the following errors:

```
# Statement timeout error
Error deleting game: {code: '57014', details: null, hint: null, message: 'canceling statement due to statement timeout'}

# Stack depth limit error
Error deleting game: {code: '54001', details: null, hint: `Increase the configuration parameter "max_stack_depth"...`, message: 'stack depth limit exceeded'}

# Temporary table error
Error deleting game: {code: '42P07', details: null, hint: null, message: 'relation "eligible_players" already exists'}
```

## Root Causes

1. **Statement Timeout**: The complex `delete_game_and_update_streaks` function was taking too long to execute, exceeding Supabase's default timeout limits (typically 3-10 seconds).

2. **Stack Depth Limit**: The recursive function calls (particularly when checking token eligibility in a loop) were exceeding PostgreSQL's maximum stack depth limit.

3. **Temporary Table Conflicts**: Previous failed executions were leaving temporary tables that weren't getting cleaned up, causing conflicts on subsequent attempts.

## Solution

The solution implements a multi-stage approach that divides the complex operation into smaller, manageable parts:

### 1. Simplified Database Functions

Created three new database functions with focused responsibilities:

```sql
-- Function 1: Simple game deletion that returns affected player IDs
CREATE OR REPLACE FUNCTION public.delete_game_simple(p_game_id uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Return list of players who had tokens used for this game
    RETURN QUERY
    SELECT DISTINCT player_id
    FROM player_tokens
    WHERE used_game_id = p_game_id;

    -- Process token returns and game deletion...
END;
$function$;

-- Function 2: Simplified token eligibility check using SQL (not PL/pgSQL)
CREATE OR REPLACE FUNCTION public.check_token_eligibility_simple(player_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    -- All conditions in a single SQL statement
    SELECT 
        -- Conditions for token eligibility...
$function$;

-- Function 3: Individual token issuance
CREATE OR REPLACE FUNCTION public.issue_token_after_game_deletion(p_player_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Token issuance logic...
END;
$function$;
```

### 2. Two-Phase Frontend Approach

Updated the `gameUtils.ts` file to implement a two-phase approach:

```typescript
export const deleteGame = async (gameId: string): Promise<{ error: any | null }> => {
  try {
    // Phase 1: Delete the game and get affected player IDs
    const { data: affectedPlayerIds, error: deleteError } = await supabase
      .rpc('delete_game_simple', { p_game_id: gameId });

    if (deleteError) throw deleteError;

    // Phase 2: Process token issuance for affected players in parallel
    if (affectedPlayerIds && affectedPlayerIds.length > 0) {
      const tokenIssuancePromises = affectedPlayerIds.map(async (playerId: string) => {
        try {
          await supabase.rpc('issue_token_after_game_deletion', { p_player_id: playerId });
        } catch (tokenError) {
          console.warn(`Error issuing token to player ${playerId}:`, tokenError);
        }
      });

      await Promise.all(tokenIssuancePromises);
    }

    return { error: null };
  } catch (error) {
    console.error('Error deleting game:', error);
    return { error };
  }
};
```

## Key Improvements

1. **Avoids Stack Depth Issues**: 
   - Replaced recursive PL/pgSQL function calls with simpler SQL statements
   - Used SQL language instead of PL/pgSQL where possible to reduce stack usage

2. **Prevents Statement Timeouts**:
   - Broke down the operation into smaller, focused functions
   - Moved complex token eligibility checks from the database to multiple client-side operations

3. **Eliminates Temporary Table Conflicts**:
   - Removed reliance on temporary tables by using direct queries
   - Added explicit cleanup of any temporary tables that might exist

4. **Improved Error Handling**:
   - Added proper error handling and logging at each stage
   - Made token issuance non-blocking (game deletion still succeeds even if token issuance fails)

## Why This Works

This solution follows the principle of "divide and conquer" to address the limitations of PostgreSQL in Supabase:

1. By splitting the operation into smaller parts, each function stays well within the statement timeout limits
2. By eliminating recursive function calls and using SQL language, we avoid stack depth issues
3. By handling token issuance in parallel from the client, we distribute the computational load

This approach also improves maintainability by creating focused functions with clear responsibilities, making future modifications easier.
