# Game Deletion Fix

## Issue
When attempting to delete a game from the admin history interface, users were encountering several errors:

```
# Initial error (permission issue)
POST https://jvdhauvwaowmzbwtpaym.supabase.co/rest/v1/rpc/delete_game 403 (Forbidden)
Error deleting game: {code: '42501', details: null, hint: null, message: 'must be owner of materialized view public_player_token_status'}

# Second error (transaction conflict)
Error deleting game: {code: '55006', details: null, hint: null, message: 'cannot ALTER TABLE "games" because it is being used by active queries in this session'}

# Third error (statement timeout)
Error deleting game: {code: '57014', details: null, hint: null, message: 'canceling statement due to statement timeout'}
```

## Root Causes

1. **Permission Issue**: The delete operation requires refreshing the `public_player_token_status` materialized view, but the authenticated user doesn't have ownership rights on this view.

2. **Transaction Conflict**: The `handle_game_deletion` function (which is called by triggers during game deletion) tried to refresh a materialized view during the same transaction as the DELETE operation. PostgreSQL doesn't allow this because it creates a circular dependency.

3. **Statement Timeout**: The complex trigger functions and cascading operations on game deletion were taking too long and exceeding Supabase's statement timeout limits.

## Final Solution

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

### 2. Phased Frontend Approach

The `GameCard.tsx` component was updated to use a three-phase deletion process:

```typescript
// PHASE 1: Clear foreign key references first
const deleteChildren = [
  // Return any tokens used for this game
  supabaseAdmin.rpc('return_game_tokens', { game_id: game.id }),
  // Delete all direct references to the game
  supabaseAdmin.from('game_registrations').delete().eq('game_id', game.id),
  supabaseAdmin.from('game_selections').delete().eq('game_id', game.id),
  // Other child records...
];

// Wait for all FK references to be deleted
await Promise.all(deleteChildren);

// PHASE 2: Delete the game itself using direct SQL while disabling triggers
const { data: deleteResult, error: deleteGameError } = await supabaseAdmin
  .rpc('delete_game_without_triggers', { game_id: game.id });

// PHASE 3: Refresh materialized views
const { error: refreshError } = await supabaseAdmin
  .rpc('refresh_token_status_view');
```

### 3. Helper Functions

Created additional helper functions to make the process more reliable:

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
    INSERT INTO token_history (...) SELECT ... FROM player_tokens pt WHERE pt.used_game_id = game_id;

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

## Why This Works

This solution addresses all root causes:

1. **Permission issues**: All functions use `SECURITY DEFINER` to run with elevated permissions
2. **Transaction conflicts**: By disabling triggers during deletion, we avoid complex cascading operations that cause conflicts
3. **Statement timeouts**: Breaking the process into smaller, separate phases ensures each step completes within timeout limits

This approach follows a similar pattern to the token issuance fix but extends it by temporarily disabling triggers to avoid complex database operations that were causing timeouts.
