# Token Management Components

## TokenManagement Page

Located in: `src/pages/admin/TokenManagement.tsx`

The main page component for managing player tokens in the admin interface.

### Features
- Displays all players and their token status
- Allows searching players by name
- Shows token statistics (active and used tokens)
- Handles token operations (issue, remove, force issue)

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
}
```

### Features
- Displays player name, token status, and relevant dates
- Shows appropriate action buttons based on token state:
  - "Remove Token" for active tokens
  - "Issue Token" for players with no token or completed cooldown
  - "Force Issue" for players in cooldown period
- Handles loading state with spinner
- Formats dates consistently

### Token States
1. **No Token**
   - Badge: Red
   - Action: Issue Token button

2. **Active**
   - Badge: Green
   - Action: Remove Token button

3. **Cooldown**
   - Badge: Yellow
   - Shows days remaining
   - Actions: Disabled "In Cooldown" + "Force Issue" buttons

4. **Ready for New Token**
   - Badge: Blue
   - Action: Issue Token button

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
- Shows count of active tokens
- Shows count of used tokens
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
}
```

## Integration with Token System

These components implement the token system as described in `docs/TokenSystem.md`:
- Tokens remain valid indefinitely until used
- Manual token removal doesn't trigger cooldown
- 22-day cooldown only applies after token use in a game
- Admin override available for cooldown period
- Single active token per player enforced
