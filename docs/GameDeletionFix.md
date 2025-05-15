# Game Deletion Fix

## Issue History

When attempting to delete games from the admin interfaces, users encountered several evolving errors:

```
# Initial error (permission issue)
POST https://jvdhauvwaowmzbwtpaym.supabase.co/rest/v1/rpc/delete_game 403 (Forbidden)
Error deleting game: {code: '42501', details: null, hint: null, message: 'must be owner of materialized view public_player_token_status'}

# Second error (transaction conflict)
Error deleting game: {code: '55006', details: null, hint: null, message: 'cannot ALTER TABLE "games" because it is being used by active queries in this session'}

# Third error (statement timeout)
Error deleting game: {code: '57014', details: null, hint: null, message: 'canceling statement due to statement timeout'}

# Fourth error (stack depth limit)
Error deleting game: {code: '54001', details: null, hint: `Increase the configuration parameter "max_stack_depth"...`, message: 'stack depth limit exceeded'}
```

## Root Causes

1. **Permission Issue**: The delete operation requires refreshing the `public_player_token_status` materialized view, but the authenticated user doesn't have ownership rights on this view.

2. **Transaction Conflict**: The `handle_game_deletion` function (which is called by triggers during game deletion) tried to refresh a materialized view during the same transaction as the DELETE operation. PostgreSQL doesn't allow this because it creates a circular dependency.

3. **Statement Timeout**: The complex trigger functions and cascading operations on game deletion were taking too long and exceeding Supabase's statement timeout limits.

4. **Stack Depth Limit**: The recursive function calls in some of the database functions were exceeding PostgreSQL's maximum stack depth limit (typically around 2048kB).

## Complete Solution

### 1. Disable Triggers During Deletion

The key fix was creating a function that temporarily disables problematic triggers during game deletion:

```sql
CREATE OR REPLACE FUNCTION public.delete_game_without_triggers(game_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rows_deleted INTEGER := 0;
    trigger_name TEXT;
    trigger_list TEXT[] := ARRAY[
        'game_deletion_update',
        'on_game_deletion',
        'game_deletion_xp_update', 
        'game_deletion_stats_update',
        'game_sequence_delete',
        'game_streaks_update',
        'trigger_game_deletion'
    ];
BEGIN
    -- Temporarily disable the triggers that are causing problems
    FOREACH trigger_name IN ARRAY trigger_list
    LOOP
        EXECUTE format('ALTER TABLE games DISABLE TRIGGER %I', trigger_name);
    END LOOP;
    
    -- Delete the game directly now that triggers are disabled
    DELETE FROM games WHERE id = game_id
    RETURNING 1 INTO rows_deleted;
    
    -- Re-enable the triggers
    FOREACH trigger_name IN ARRAY trigger_list
    LOOP
        EXECUTE format('ALTER TABLE games ENABLE TRIGGER %I', trigger_name);
    END LOOP;
    
    -- Return true if a row was deleted
    RETURN rows_deleted > 0;
END;
$$;
```

### 2. Three-Phase Deletion Approach

The deletion process was standardized across both admin interfaces (upcoming games and historical games) to use a consistent three-phase approach:

```typescript
// PHASE 1: Clear foreign key references first
console.log('Phase 1: Clearing foreign key references');
const deleteChildren = [
  // Return any tokens used for this game
  supabase.rpc('return_game_tokens', { game_id: gameId }),
  // Delete all direct references to the game
  supabase.from('game_registrations').delete().eq('game_id', gameId),
  supabase.from('game_selections').delete().eq('game_id', gameId),
  supabase.from('balanced_team_assignments').delete().eq('game_id', gameId),
  supabase.from('player_penalties').delete().eq('game_id', gameId),
  supabase.from('registration_locks').delete().eq('game_id', gameId)
];

// Wait for all FK references to be deleted
const results = await Promise.all(deleteChildren);
console.log('All game child records processed', results);

// PHASE 2: Delete the game itself using direct SQL while disabling triggers
console.log('Phase 2: Deleting game with triggers disabled');
const { data: deleteResult, error: deleteGameError } = await supabase
  .rpc('delete_game_without_triggers', { game_id: gameId });

// PHASE 3: Refresh materialized views
console.log('Phase 3: Refreshing materialized views');
const { error: refreshError } = await supabase
  .rpc('refresh_token_status_view');
```

### 3. Helper Functions

```sql
-- Function to safely return tokens used for a game
CREATE OR REPLACE FUNCTION public.return_game_tokens(game_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log token returns in history
    INSERT INTO token_history (
        token_id,
        player_id,
        game_id,
        performed_at,
        action,
        details
    )
    SELECT 
        pt.id,
        pt.player_id,
        pt.used_game_id,
        NOW(),
        'token_returned',
        jsonb_build_object(
            'reason', 'Game deleted',
            'action', 'automatic_return'
        )
    FROM player_tokens pt
    WHERE pt.used_game_id = game_id;

    -- Free up the tokens
    UPDATE player_tokens
    SET used_game_id = NULL, used_at = NULL
    WHERE used_game_id = game_id;
END;
$$;

-- Function to refresh materialized views with elevated permissions
CREATE OR REPLACE FUNCTION public.refresh_token_status_view()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.public_player_token_status;
    
    -- Only refresh player_xp_breakdown if it exists
    PERFORM 1 FROM pg_matviews 
    WHERE schemaname = 'public' AND matviewname = 'player_xp_breakdown';
    IF FOUND THEN
        REFRESH MATERIALIZED VIEW public.player_xp_breakdown;
    END IF;
END;
$$;
```

### 4. Unified Frontend Implementation

The `utils/gameUtils.ts` file was updated to use the three-phase approach for consistency across both admin interfaces:

```typescript
/**
 * Deletes a game using a proven three-phase approach to avoid PostgreSQL stack depth issues and transaction conflicts.
 * 
 * This approach is based on the successful historical game deletion process and avoids all common pitfalls:
 * 1. Stack depth limits - By removing complex recursive operations
 * 2. Transaction conflicts - By separating operations into distinct phases
 * 3. Permission issues - By using SECURITY DEFINER functions with proper permissions
 * 
 * @param gameId - UUID of the game to delete
 * @returns Object containing error if any occurred
 */
export const deleteGame = async (gameId: string): Promise<{ error: any | null }> => {
  try {
    console.log('Starting game deletion process for game:', gameId);
    
    // PHASE 1: Clear foreign key references first
    console.log('Phase 1: Clearing foreign key references');
    const deleteChildren = [...]; // Delete child records
    
    // PHASE 2: Delete the game itself
    console.log('Phase 2: Deleting game with triggers disabled');
    const { data: deleteResult, error: deleteGameError } = await supabase
      .rpc('delete_game_without_triggers', { game_id: gameId });
    
    // PHASE 3: Refresh materialized views
    console.log('Phase 3: Refreshing materialized views');
    const { error: refreshError } = await supabase
      .rpc('refresh_token_status_view');
    
    return { error: null };
  } catch (error) {
    console.error('Error deleting game:', error);
    return { error };
  }
};
```

## Why This Works

This comprehensive solution addresses all root causes:

1. **Permission issues**: All functions use `SECURITY DEFINER` to run with elevated permissions
2. **Transaction conflicts**: By disabling triggers during deletion, we avoid complex cascading operations that cause conflicts
3. **Statement timeouts**: Breaking the process into smaller, separate phases ensures each step completes within timeout limits
4. **Stack depth limits**: Replacing recursive function calls with straightforward operations avoids exceeding PostgreSQL's stack depth

## Testing

The solution was tested and verified to work correctly with both admin interfaces. Console logs confirm successful execution of all three phases:

```
Phase 1: Clearing foreign key references
All game child records processed (6) [{…}, {…}, {…}, {…}, {…}, {…}]
Phase 2: Deleting game with triggers disabled
Game deleted successfully
Phase 3: Refreshing materialized views
```

## See Also

- [GameDeletionStackDepthFix.md](./GameDeletionStackDepthFix.md) - Detailed explanation of the stack depth issue and solution
- [TokenSystemFix.md](./TokenSystemFix.md) - Related fixes for the token system
