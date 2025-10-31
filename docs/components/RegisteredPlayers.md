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

**Selection Odds Feature:**
The grid component groups players into collapsible sections based on their selection status:
- **Guaranteed Section** - Players with 100% chance of selection (token users or safe merit positions)
- **At Risk Section** - Players with < 100% chance who could be pushed down by unregistered players
  - Shows merit zone players at risk of being pushed to random selection
  - Shows "The Randomiser" section for players in random selection zone with their % odds

The selection odds are calculated using the `calculateSelectionOdds()` function from `src/utils/selectionOdds.ts`.

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

**Database Functions Used:**
When a `gameId` is provided, the hook calls several database functions:
1. `check_previous_game_token_usage` - Identifies players who used priority tokens in the previous game (for token cooldown)
2. `get_eligible_token_holders_not_in_game` - Returns eligible players with unused tokens who haven't registered (for selection odds calculation)

These database functions are critical for accurate selection odds calculation and token cooldown features.

**Location:** `src/hooks/useGameRegistrationStats.ts`

## Data Flow

1. `RegisteredPlayers` receives registration data and optional `gameId` from parent
2. `useGameRegistrationStats` hook fetches and processes:
   - Player stats from Supabase
   - Registration streak data
   - Win rates and game stats
   - Token cooldown data (if `gameId` provided) via `check_previous_game_token_usage` RPC
   - Unregistered token holders (if `gameId` provided) via `get_eligible_token_holders_not_in_game` RPC
   - Unregistered players XP values (for selection odds calculation)
3. Data is passed to `RegisteredPlayerGrid` or `RegisteredPlayerListView` along with:
   - `unregisteredTokenHoldersCount` - Count of eligible players with unused tokens not registered
   - `unregisteredPlayersXP` - Array of XP values for all unregistered active players (sorted descending)
4. `RegisteredPlayerGrid` calculates selection odds for each player using `calculateSelectionOdds()`
5. Components render `PlayerCard` components grouped by selection status (Guaranteed / At Risk)
6. Token cooldown indicators (MdPauseCircle icon from react-icons/md) displayed where applicable

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

The RegisteredPlayers component displays a visual indicator (MdPauseCircle icon from react-icons/md) for players who are on "token cooldown". This means they used a priority token in the previous game and will be deprioritized during player selection for the current game.

**How it works:**
1. When `gameId` is provided, the system calls `check_previous_game_token_usage` database function
2. The function returns IDs of players who used tokens in the previous sequential game
3. These player IDs are stored in `tokenCooldownPlayerIds` Set
4. Visual indicators are displayed in multiple locations:
   - **Grid View**: MdPauseCircle icon (warning color) appears in top-left corner of player card with tooltip
   - **List View**: MdPauseCircle icon (warning color) appears next to player name with tooltip
5. Tooltip explains: "Token Cooldown - used token in previous game (deprioritized this week)"

**Related Documentation:**
- See [Token System](../TokenSystem.md) for complete priority token mechanics
- Token cooldown affects merit-based selection (see `playerSelection.ts:106-114`)

## Selection Odds Calculation

The RegisteredPlayerGrid component displays real-time selection odds for each player, helping them understand their likelihood of being selected for the game.

### How It Works

The `calculateSelectionOdds()` function (from `src/utils/selectionOdds.ts`) considers multiple factors:

1. **Token Users** - Always 100% guaranteed (highest priority)
2. **Merit-Based Selection** - XP-based selection with threat assessment from:
   - Unregistered players with higher XP
   - Unregistered players with unused priority tokens
3. **Random Selection** - Weighted probability based on bench warmer streak

### Classification Logic

Players are classified into one of these statuses:

- **Guaranteed (100%)**: Token users OR players safe in merit zone even if all threats materialize
- **Merit - At Risk (85% or 60%)**: Players currently in merit zone but could be pushed down by late registrations
- **Random Selection (variable %)**: Players outside merit slots competing for random slots
- **Unlikely (0%)**: Token cooldown players with no chance due to enough eligible players

### Key Algorithm Features

- **Worst-case analysis**: Calculates position if ALL unregistered higher-XP players register
- **Token slot reduction**: Merit slots reduced by count of unregistered token holders
- **Exact probability**: Uses recursive calculation for weighted random selection (not approximation)
- **Conservative warnings**: Intentionally shows "At Risk" to encourage early registration

### Visual Selection Point Indicators (Added 2025-10-31)

Players in the random selection zone display colored circles (●) showing their selection points:

**How Selection Points Work:**
- Each player gets: **1 base point + bench_warmer_streak bonus points**
- Example: 2 consecutive reserve games = 1 base + 2 streak = **3 points** = ●●●
- More points = higher probability of selection in weighted random draw

**Visual Display:**
- **Card View**: Dots appear to the left of the percentage badge, vertically centered
- **List View**: Dots appear next to player name with odds badge
- **Color Coding**:
  - 🔵 Blue dots = 85%+ odds
  - 🟡 Yellow dots = 50-84% odds
  - 🔴 Red dots = <50% odds
- **Tooltip**: Hover shows "X selection points (1 base + Y reserve streak)"

**"How It Works" Explainer:**
- Collapsible section in THE RANDOMISER card
- Explains selection point system
- Collapsed by default to save space
- Custom implementation with animated chevron

**Components:**
- `RegisteredPlayerGrid.tsx` - Card view with dots positioned at `top-2 right-16`
- `RegisteredPlayerListView.tsx` - List view with inline dots
- Both use `FaCircle` icons from `react-icons/fa`

### Database Dependencies

The accuracy of selection odds depends on these RPC functions:
- `get_eligible_token_holders_not_in_game` - Critical for correct threat assessment
- `check_previous_game_token_usage` - For token cooldown deprioritization
- `calculate_bench_warmer_streak` - Correctly counts consecutive reserve appearances (fixed 2025-10-31)

**Related Fix Documentation:**
- See [Selection Odds Token Counting Fix](../fixes/SelectionOddsTokenCountingFix.md) for details on the 2025-10-24 bug fix
- See [Bench Warmer Streak Calculation Fix](../fixes/BenchWarmerStreakCalculationFix.md) for details on the 2025-10-31 bug fix

## Related Components
- [PlayerCard](./PlayerCard.md) - Used to display individual player information
- [GameHeader](./GameHeader.md) - Often used alongside RegisteredPlayers in game views

## Related Documentation
- See [Adding New Player Stats/Modifiers Guide](../guides/adding-player-stats.md) for detailed instructions on how to add new stats or modifiers to player cards
