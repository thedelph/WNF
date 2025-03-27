# Token System Issuance Fix

## Overview

This document describes a fix implemented for the token issuance system to address permission errors when issuing tokens through the admin interface.

## The Issue

When attempting to issue a token to a player through the admin interface, the following error was encountered:

```
POST https://jvdhauvwaowmzbwtpaym.supabase.co/rest/v1/player_tokens 403 (Forbidden)
Supabase insert error: {code: '42501', details: null, hint: null, message: 'must be owner of materialized view public_player_token_status'}
```

This occurred because:
1. The application was trying to insert directly into the `player_tokens` table
2. A trigger or function was then trying to refresh the `public_player_token_status` materialized view
3. The application user didn't have permission to refresh this view

## The Solution

The issue was fixed by implementing a database function with elevated permissions that handles the token issuance process:

1. Created a `SECURITY DEFINER` SQL function called `issue_player_token` that:
   - Takes a player UUID as input
   - Checks if the player already has an active token
   - Inserts a new token if they don't
   - Logs the token issuance in the token_history table with the correct 'token_created' enum value
   - Refreshes the materialized view with elevated permissions

2. Updated the TokenManagement.tsx component to use an RPC call to this function instead of directly inserting into the player_tokens table.

### SQL Function Implementation

```sql
CREATE OR REPLACE FUNCTION issue_player_token(player_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_token_id UUID;
BEGIN
    -- Check if player already has an active token
    IF EXISTS (
        SELECT 1 FROM player_tokens 
        WHERE player_id = player_uuid 
        AND used_at IS NULL 
        AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RAISE EXCEPTION 'Player already has an active token';
    END IF;

    -- Insert new token
    INSERT INTO player_tokens (
        player_id, 
        issued_at, 
        expires_at
    ) VALUES (
        player_uuid, 
        NOW(), 
        NULL
    )
    RETURNING id INTO v_token_id;
    
    -- Log the token issuance in token_history with the correct enum value
    INSERT INTO token_history (
        token_id,
        player_id,
        performed_at,
        action,
        details
    ) VALUES (
        v_token_id,
        player_uuid,
        NOW(),
        'token_created',
        jsonb_build_object(
            'action', 'Token issued manually by admin'
        )
    );

    -- Refresh the materialized view
    REFRESH MATERIALIZED VIEW public_player_token_status;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Frontend Implementation

The TokenManagement.tsx component was updated to use the new function via RPC:

```typescript
// Use a direct RPC call to issue_token function instead of inserting directly
// This bypasses the materialized view permission issue
const { error: insertError } = await supabaseAdmin
  .rpc('issue_player_token', { player_uuid: playerId });
```

## Benefits

This approach:
1. Bypasses the permission issue with the materialized view
2. Maintains all the functionality of the token system
3. Properly logs token issuance in the history table
4. Uses the correct token action enum values
5. Provides better error handling

## Related Components

- `src/pages/admin/TokenManagement.tsx`: The main admin interface for managing tokens
- `SQL/functions/issue_player_token.sql`: The SQL function that handles token issuance

## Token Action Enum Values

The valid values for the token_action enum in the token_history table are:
- token_created
- token_used
- token_returned
- token_forgiven
- token_expired
- token_revoked

## Future Considerations

If similar permission issues arise with other token operations (e.g., revoking tokens), the same pattern can be applied:
1. Create a `SECURITY DEFINER` function for the operation
2. Update the frontend to use an RPC call to this function
3. Ensure proper logging in the token_history table with the correct enum values
