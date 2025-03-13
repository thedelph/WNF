# Token Management Components

## TokenManagement Page

Located in: `src/pages/admin/TokenManagement.tsx`

The main page component for managing player tokens in the admin interface.

### Features
- Displays all players and their token status
- Allows searching players by name
- Shows token statistics (active and used tokens)
- Handles token operations (issue, remove, force issue)
- Auto-refreshes token status to reflect eligibility changes

### Props
None - this is a page component

### State
- `tokenData`: Array of `TokenData` objects containing player and token information
- `loading`: Boolean indicating if data is being fetched
- `searchTerm`: String for filtering players by name

### Key Functions
- `fetchTokenData()`: Fetches all players and their current token status
- `handleIssueToken(playerId)`: Issues a new token to a player
- `handleRemoveToken(tokenId)`: Removes a token without triggering cooldown
- `handleRefresh()`: Manually refreshes token status

## TokenTable Component

Located in: `src/components/admin/tokens/TokenTable.tsx`

A table component that displays player token information and provides token management actions.

### Props
```typescript
interface TokenTableProps {
  tokens: TokenData[];           // Array of token data to display
  loading: boolean;             // Loading state
  onRemoveToken: (tokenId: string) => Promise<void>;  // Callback for token removal
  onIssueToken: (playerId: string) => Promise<void>;  // Callback for token issuance
  onRefresh: () => Promise<void>;  // Callback to refresh token status
}
```

### Features
- Displays player name, token status, and relevant dates
- Shows appropriate action buttons based on token state:
  - "Remove Token" for active tokens
  - "Issue Token" for eligible players with no token
  - "Force Issue" for players in cooldown period
- Handles loading state with spinner
- Formats dates consistently
- Includes refresh button to update eligibility status

### Token States
1. **No Token**
   - Badge: Red
   - Action: Issue Token button (if eligible)

2. **Active**
   - Badge: Green
   - Action: Remove Token button
   - Note: Only shown if player is currently eligible

3. **Ineligible**
   - Badge: Gray
   - Shows reason (not played recently or selected too recently)
   - No actions available

4. **Cooldown**
   - Badge: Yellow
   - Shows days remaining
   - Actions: Disabled "In Cooldown" + "Force Issue" buttons

## TokenStats Component

Located in: `src/components/admin/tokens/TokenStats.tsx`

A component that displays statistics about token usage.

### Props
```typescript
interface TokenStatsProps {
  tokens: TokenData[];  // Array of token data to calculate stats from
}
```

### Features
- Shows count of active and eligible tokens
- Shows count of used tokens
- Shows count of ineligible tokens
- Updates automatically when token data changes

### Usage Example
```tsx
<TokenStats tokens={tokenData} />
```

## Types

Located in: `src/types/tokens.ts`

```typescript
export interface TokenData {
  id: string;
  player_id: string;
  friendly_name: string;
  issued_at: string | null;
  used_at: string | null;
  used_game_id: string | null;
  expires_at: string | null;
  is_eligible: boolean;
}
```

## Integration with Token System

These components implement the token system as described in `docs/TokenSystem.md`:
- Tokens are only valid while a player maintains eligibility
- Tokens expire after 7 days from issuance
- Manual token removal doesn't trigger cooldown
- 22-day cooldown only applies after token use in a game
- Single active token per player enforced
- Eligibility requires:
  1. Played in at least 1 of last 5 games
  2. Not selected in last 3 games
  3. No outstanding payments (unpaid games)

## Implementation Notes

### Unpaid Games Check

The TokenManagement component implements the unpaid games check as follows:

```typescript
// Direct query to game_registrations table
const { data: unpaidRegistrations } = await supabase
  .from('game_registrations')
  .select('player_id')
  .eq('status', 'selected')
  .eq('paid', false);

// Count unpaid games for each player
const unpaidGamesMap = new Map();
unpaidRegistrations?.forEach(registration => {
  const playerId = registration.player_id;
  const currentCount = unpaidGamesMap.get(playerId) || 0;
  unpaidGamesMap.set(playerId, currentCount + 1);
});
```

This approach:
- Directly queries the game_registrations table
- Avoids SQL errors related to database views
- Calculates unpaid games count in JavaScript
- Provides consistent results with the useTokenStatus hook
- Ensures real-time payment status checks
