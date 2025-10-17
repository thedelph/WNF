# RegisteredPlayers Component

The RegisteredPlayers system is composed of three main parts:

## Components

### RegisteredPlayers
The main component that orchestrates the player registration display. It uses the `useGameRegistrationStats` hook for data fetching and passes the data to `RegisteredPlayerGrid` for rendering.

**Props:**
- `registrations: Registration[]` - Array of player registrations for the game
- `maxPlayers?: number` - Maximum number of players allowed in the game
- `randomSlots?: number` - Number of slots allocated via random selection
- `gameId?: string` - Game ID used to fetch token cooldown data for players who used tokens in the previous game

**Location:** `src/components/game/RegisteredPlayers.tsx`

### RegisteredPlayerGrid
A presentational component that handles the grid layout and rendering of individual PlayerCards.

**Props:**
- `registrations: Registration[]` - Array of player registrations
- `playerStats: Record<string, any>` - Player statistics including XP, win rates, etc.
- `stats: Record<string, any>` - Game-specific stats like streaks and bonuses
- `tokenCooldownPlayerIds?: Set<string>` - Set of player IDs who are on token cooldown (used token in previous game)

**Location:** `src/components/game/RegisteredPlayerGrid.tsx`

**Grid Layout:**
- Mobile (< 640px): 1 card per row
- Small (≥ 640px): 2 cards per row
- Large (≥ 1024px): 3 cards per row
- XL (≥ 1280px): 4 cards per row
- 2XL (≥ 1536px): 6 cards per row

### RegisteredPlayerListView
An alternative list view component for displaying registered players in a compact format.

**Props:**
- `registrations: Registration[]` - Array of player registrations
- `playerStats: Record<string, any>` - Player statistics including XP, win rates, etc.
- `stats: Record<string, any>` - Game-specific stats like streaks and bonuses
- `xpSlots: number` - Number of slots allocated via XP/merit selection
- `tokenCooldownPlayerIds?: Set<string>` - Set of player IDs who are on token cooldown (used token in previous game)

**Location:** `src/components/game/RegisteredPlayerListView.tsx`

## Hooks

### useGameRegistrationStats
Custom hook that handles fetching and processing player statistics for game registrations. Also fetches token cooldown data if a `gameId` is provided.

**Parameters:**
- `registrations: Registration[]` - Array of player registrations
- `gameId?: string` - Optional game ID to fetch token cooldown data (players who used tokens in previous game)

**Returns:**
```typescript
{
  loading: boolean;
  error: string | null;
  playerStats: Record<string, PlayerStats>;
  stats: Record<string, any>;
  tokenCooldownPlayerIds: Set<string>; // IDs of players on token cooldown
}
```

**Token Cooldown Logic:**
When a `gameId` is provided, the hook calls the `check_previous_game_token_usage` database function to identify players who used priority tokens in the previous sequential game. These players are deprioritized during player selection (moved to bottom of merit-based selection list).

**Location:** `src/hooks/useGameRegistrationStats.ts`

## Data Flow

1. `RegisteredPlayers` receives registration data and optional `gameId` from parent
2. `useGameRegistrationStats` hook fetches and processes:
   - Player stats from Supabase
   - Registration streak data
   - Win rates and game stats
   - Token cooldown data (if `gameId` provided) via `check_previous_game_token_usage` RPC
3. Data is passed to `RegisteredPlayerGrid` or `RegisteredPlayerListView`
4. Components render `PlayerCard` components with appropriate data, including token cooldown indicators (⏸️ emoji)

## Example Usage

```tsx
import { RegisteredPlayers } from '../components/game/RegisteredPlayers';

function GamePage() {
  return (
    <RegisteredPlayers
      registrations={gameRegistrations}
      maxPlayers={upcomingGame.max_players}
      randomSlots={upcomingGame.random_slots || 0}
      gameId={upcomingGame.id} // Include gameId to enable token cooldown indicators
    />
  );
}
```

## Token Cooldown Feature

The RegisteredPlayers component displays a visual indicator (⏸️ emoji) for players who are on "token cooldown". This means they used a priority token in the previous game and will be deprioritized during player selection for the current game.

**How it works:**
1. When `gameId` is provided, the system calls `check_previous_game_token_usage` database function
2. The function returns IDs of players who used tokens in the previous sequential game
3. These player IDs are stored in `tokenCooldownPlayerIds` Set
4. Visual indicators are displayed in multiple locations:
   - **Grid View**: ⏸️ emoji appears in top-left corner of player card with tooltip
   - **List View**: ⏸️ emoji appears next to player name with tooltip
5. Tooltip explains: "Token Cooldown - used token in previous game (deprioritized this week)"

**Related Documentation:**
- See [Token System](../TokenSystem.md) for complete priority token mechanics
- Token cooldown affects merit-based selection (see `playerSelection.ts:106-114`)

## Related Components
- [PlayerCard](./PlayerCard.md) - Used to display individual player information
- [GameHeader](./GameHeader.md) - Often used alongside RegisteredPlayers in game views

## Related Documentation
- See [Adding New Player Stats/Modifiers Guide](../guides/adding-player-stats.md) for detailed instructions on how to add new stats or modifiers to player cards
