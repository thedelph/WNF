# RegisteredPlayers Component

The RegisteredPlayers system is composed of three main parts:

## Components

### RegisteredPlayers
The main component that orchestrates the player registration display. It uses the `useGameRegistrationStats` hook for data fetching and passes the data to `RegisteredPlayerGrid` for rendering.

**Props:**
- `registrations: Registration[]` - Array of player registrations for the game

**Location:** `src/components/game/RegisteredPlayers.tsx`

### RegisteredPlayerGrid
A presentational component that handles the grid layout and rendering of individual PlayerCards.

**Props:**
- `registrations: Registration[]` - Array of player registrations
- `playerStats: Record<string, any>` - Player statistics including XP, win rates, etc.
- `stats: Record<string, any>` - Game-specific stats like streaks and bonuses

**Location:** `src/components/game/RegisteredPlayerGrid.tsx`

**Grid Layout:**
- Mobile (< 640px): 1 card per row
- Small (≥ 640px): 2 cards per row
- Large (≥ 1024px): 3 cards per row
- XL (≥ 1280px): 4 cards per row
- 2XL (≥ 1536px): 6 cards per row

## Hooks

### useGameRegistrationStats
Custom hook that handles fetching and processing player statistics for game registrations.

**Parameters:**
- `registrations: Registration[]` - Array of player registrations

**Returns:**
```typescript
{
  loading: boolean;
  error: string | null;
  playerStats: Record<string, PlayerStats>;
  stats: Record<string, any>;
}
```

**Location:** `src/hooks/useGameRegistrationStats.ts`

## Data Flow

1. `RegisteredPlayers` receives registration data from parent
2. `useGameRegistrationStats` hook fetches and processes:
   - Player stats from Supabase
   - Registration streak data
   - Win rates and game stats
3. Data is passed to `RegisteredPlayerGrid`
4. Grid component renders `PlayerCard` components with appropriate data

## Example Usage

```tsx
import { RegisteredPlayers } from '../components/game/RegisteredPlayers';

function GamePage() {
  return (
    <RegisteredPlayers registrations={gameRegistrations} />
  );
}
```

## Related Components
- [PlayerCard](./PlayerCard.md) - Used to display individual player information
- [GameHeader](./GameHeader.md) - Often used alongside RegisteredPlayers in game views

## Related Documentation
- See [Adding New Player Stats/Modifiers Guide](../guides/adding-player-stats.md) for detailed instructions on how to add new stats or modifiers to player cards
