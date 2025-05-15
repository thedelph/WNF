# Player Profile Multiple Matches Fix

## Issue Summary
When attempting to view a player's profile by their name, the application would encounter an error if multiple players matched the search criteria. This issue specifically occurred when the URL contained a player name that could match multiple entries in the database.

## Error Details
The error manifested as a `406 Not Acceptable` HTTP response from Supabase with:
```
{code: 'PGRST116', details: 'The result contains 2 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned'}
```

This occurred because the application was:
1. Using a URL-friendly version of the player name with a `%` wildcard appended to it
2. Using `.single()` in the Supabase query, which expects exactly one result
3. Not handling the case where multiple players with similar names exist in the database

## Solution
The fix updates the `fetchPlayerData` function in `PlayerProfile.tsx` to implement a more robust searching approach:

1. **Multi-stage search strategy**:
   - First attempt an exact match (without wildcards)
   - If that fails, try a partial match and handle multiple results gracefully
   
2. **User feedback**:
   - When multiple matches are found, the first match is displayed
   - A toast notification informs the user that multiple matches were found

3. **Error handling**:
   - Proper error handling prevents the application from crashing
   - Meaningful error messages help users understand what happened

## Implementation Details
The updated implementation follows this flow:

```typescript
// If searching by ID, fetch the exact player
if (params.id) {
  // Direct ID lookup
}
// If searching by name
else if (params.friendlyName) {
  // First try exact match (no wildcard)
  const exactName = fromUrlFriendly(params.friendlyName).replace(/%$/, '');
  const exactResult = await executeWithRetry(
    () => playerQuery.eq('friendly_name', exactName)
  );
  
  if (exactResult.data && exactResult.data.length === 1) {
    // Exact match found
    playerData = exactResult.data[0];
  } else {
    // Try partial match but handle multiple results
    const partialResult = await executeWithRetry(
      () => playerQuery.ilike('friendly_name', fromUrlFriendly(params.friendlyName || ''))
    );
    
    if (partialResult.data && partialResult.data.length > 0) {
      if (partialResult.data.length === 1) {
        // Only one match found
        playerData = partialResult.data[0];
      } else {
        // Multiple matches found - take the first one but show a notification
        playerData = partialResult.data[0];
        toast.info(`Multiple players found with similar names. Showing first match.`);
      }
    }
  }
}
```

## Benefits
- Prevents the application from crashing when multiple player matches are found
- Provides better user experience with meaningful feedback
- Maintains the ability to search for players by partial name
- Ensures compatibility with existing URL patterns and routing

## Future Considerations
In the future, we might consider:
1. Implementing a disambiguation page when multiple matches are found
2. Adding a player search dropdown in the UI to avoid ambiguous URLs
3. Using unique identifiers more consistently throughout the application
