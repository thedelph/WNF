# Player Card Component

The Player Card component is a key UI element that displays player information in an interactive, flippable card format. It shows various player statistics, achievements, and status indicators.

## Card Statistics Layout (Updated 2025-10-09)

The card has been restructured to prioritize XP-relevant information:
- **Front face**: Shows "Last 40 Games" - the number of games played in the last 40 completed games (the XP calculation window)
- **Back face**: Shows "Caps" - total career games played across all time

This change aligns the displayed statistics with the XP system, which only considers the last 40 games when calculating base XP (games 40+ ago contribute 0 XP).

## Component Structure

The Player Card system is split into several components for better maintainability:

- `PlayerCard.tsx` - Main container component that handles the card's state and animation
- `PlayerCardFront.tsx` - Front face of the card showing primary player information
- `PlayerCardBack.tsx` - Back face showing detailed player statistics
- `PlayerCardModifiers.tsx` - Displays active modifiers (streaks, penalties, etc.)
- `PlayerCardStats.tsx` - Shows player statistics (win rate, W/D/L, total games)
- `PlayerCardBadges.tsx` - Manages status badges and indicators
- `RankShield.tsx` - Displays player's global rank in the top right corner

## Features

- Interactive flip animation using Framer Motion
- Displays player's friendly name centered on both sides for better UX
- Shows various statistics and achievements
- Indicates special statuses (random pick, slot offers, etc.)
- WhatsApp group membership indicator in top left corner
- Visual feedback for streaks and penalties
- Global rank shield displaying the player's rank (only visible on front face)
- Responsive design with hover and tap animations

## Modifiers and Bonuses

The player card displays various modifiers that affect XP gain:

1. **Streak Bonus**: +10% XP per consecutive game played
2. **Dropout Penalty**: -50% XP per dropout
3. **Active Bonuses**: +10% XP per active bonus
4. **Active Penalties**: -10% XP per active penalty
5. **Bench Warmer**: +5% XP per consecutive game in reserves
6. **Registration Streak**: +2.5% XP per consecutive registration (shown as "Reg. Streak")
7. **Unpaid Games**: -50% XP per unpaid game

Each modifier is displayed in a colored badge with its corresponding percentage:
- Green badges for positive modifiers (streak bonus, active bonuses)
- Red badges for negative modifiers (dropout penalty, active penalties, unpaid games)
- Blue badge for registration streak bonus
- Yellow badge for bench warmer streak

## Rarity Tiers

The player card uses different background styles to represent the player's rarity tier:

- **Legendary**: Gold gradient with animation (top 2% of players)
- **World Class**: Purple gradient with animation (top 7% of players)
- **Professional**: Blue gradient with animation (top 20% of players)
- **Semi Pro**: Green gradient with animation (top 40% of players) 
- **Amateur**: Grey gradient (all remaining players with XP > 0)
- **Retired**: Black background with light text (players with 0 XP)

The player's rarity tier is displayed in a badge at the bottom right corner of the card. Rank shields are only shown for players with XP > 0 (non-Retired players).

## Implementation Details

### Recent Games Calculation

The "Last 40 Games" statistic displays how many of the last 40 completed games a player has participated in. This aligns with the XP system's 40-game rolling window.

1. **Query Optimization** (Fixed 2025-10-09):
   - Initial implementation hit Supabase's 1,000 row limit when fetching all game registrations
   - **Solution**: Sequential queries that filter at the database level
   - First fetches the last 40 completed games to get their IDs
   - Then fetches only registrations for those specific games (~718 rows vs 1,175+)
   - See [RecentGamesQueryLimitFix.md](../fixes/RecentGamesQueryLimitFix.md) for details

2. **Data Sources**:
   - `games` table: Identifies the last 40 completed historical games
   - `game_registrations` table: Counts player participation in those games
   - Filter: `status = 'selected'` (only counts actual game participation, not reserves)

3. **Implementation**:
   ```typescript
   // Step 1: Get last 40 games
   const { data: latestGameData } = await supabase
     .from('games')
     .select('id, sequence_number')
     .eq('completed', true)
     .eq('is_historical', true)
     .order('sequence_number', { ascending: false })
     .limit(40);

   const last40GameIds = latestGameData.map(g => g.id);

   // Step 2: Fetch registrations ONLY for those games
   const { data: gameRegistrationsData } = await supabase
     .from('game_registrations')
     .select('player_id, game_id, status')
     .in('game_id', last40GameIds)
     .eq('status', 'selected');

   // Step 3: Count per player
   const recentGamesMap = gameRegistrationsData.reduce((acc, reg) => {
     acc[reg.player_id] = (acc[reg.player_id] || 0) + 1;
     return acc;
   }, {});
   ```

4. **Display Location**:
   - Front of card (replaces old Caps position)
   - Uses Activity icon to represent game participation
   - Shown as "X/40" format (e.g., "36/40")

### Attendance Streak Data
The player card displays attendance streak information with the following implementation:

1. **Data Source**:
   - Max streak values are fetched from the `player_streak_stats` view rather than the `players` table
   - This ensures consistency with the Stats page and other components
   - The `player_streak_stats` view provides accurate longest attendance streak data

2. **Data Flow**:
   - The `usePlayerGrid` hook fetches streak data from both sources:
     - `players` table (legacy source)
     - `player_streak_stats` view (source of truth)
   - The hook prioritizes the value from `player_streak_stats` view
   - Fallback logic is in place if streak stats are unavailable

3. **Implementation Details**:
   ```typescript
   // In usePlayerGrid.ts
   const streakStatsMap = (streakStatsData || []).reduce((acc, player) => {
     acc[player.friendly_name] = {
       longestStreak: player.longest_streak || 0,
       longestStreakPeriod: player.longest_streak_period
     };
     return acc;
   }, {});
   
   // Use the longest_streak from player_streak_stats if available
   const correctMaxStreak = streakStatsMap[player.friendly_name]?.longestStreak || 0;
   ```

### Registration Streak
The registration streak bonus helps reserve players who consistently register but don't get selected by providing a temporary XP boost.

1. **How it Works**:
   - Tracks consecutive games where a player has registered (not dropped out)
   - Provides a 2.5% XP bonus per streak level
   - Bonus applies to ANY reserve player with a registration streak
   - Players don't need to be reserves for their entire streak

2. **Data Flow**:
   - Registration streak data comes from the `player_current_registration_streak_bonus` view
   - Key fields: `current_streak_length` and `bonus_applies`
   - Accessed via player's `friendly_name` in RegisteredPlayers.tsx

3. **State Management**:
   - Registration streak data is stored in a separate stats map in RegisteredPlayers.tsx
   - Data is processed during the fetchPlayerStats effect
   - Each player's stats include:
     ```typescript
     {
       registrationStreak: number,      // From current_streak_length
       registrationStreakApplies: boolean  // From bonus_applies
     }
     ```

4. **Display Logic**:
   - Only shows when both conditions are true:
     - registrationStreakBonus > 0
     - registrationStreakBonusApplies is true
   - Applies a 2.5% XP bonus per streak level
   - Rendered in PlayerCardModifiers with a blue background

5. **Example**:
   - Jude: 8-game registration streak, reserve in latest game → 20% bonus applies
   - Zhao: 1-game registration streak, reserve in latest game → 2.5% bonus applies

### Other Modifiers
- Positive modifiers use specific colors:
  - Streak Bonus: Green background
  - Active Bonuses: Green background
  - Bench Warmer: Purple background with CircleDot icon
- Negative modifiers use red backgrounds:
  - Dropout Penalty
  - Active Penalties
  - Unpaid Games

## Rank Shield Implementation

The rank shield feature was implemented with the following components:

1. **RankShield Component** (`src/components/player-card/RankShield.tsx`):
   - Uses Lucide React's Shield icon
   - Displays the player's global rank from the database
   - Consistent white color for better visibility
   - Includes rank number centered inside shield
   - Uses Radix UI Tooltip for rank information (only visible on front face)
   - Framer Motion animations for smooth appearance

2. **PlayerCardFront Integration**:
   - Shield positioned absolutely in top right corner
   - Matches WhatsApp indicator positioning style
   - Z-index handling to stay above card content
   - Conditionally rendered based on card flip state
   - Tooltip automatically hidden when card is flipped

3. **Rank Data Flow**:
   - Rank is fetched from the `player_xp` table in the database
   - Passed through the component tree via playerStats
   - No local rank calculation - uses global rank for consistency
   - isFlipped state controls rank shield visibility

Example rank shield code:
```tsx
<div className="absolute top-2 right-2 z-10">
  {rank && rank <= 16 && !isFlipped && (
    <RankShield rank={rank} />
  )}
</div>
```

## Props

See individual component documentation for detailed prop information:
- [PlayerCard Props](./PlayerCardProps.md)
- [PlayerCardModifiers Props](./PlayerCardModifiersProps.md)
- [PlayerCardStats Props](./PlayerCardStatsProps.md)
- [PlayerCardBadges Props](./PlayerCardBadgesProps.md)

### PlayerCard Props
| Prop | Type | Description |
|------|------|-------------|
| id | string | Unique identifier for the player |
| friendlyName | string | Display name of the player |
| xp | number | Player's experience points |
| rank | number? | Player's global rank from the database (optional) |
| isFlipped | boolean? | Whether the card is currently flipped (controls rank shield visibility) |
| caps | number | Player's total caps (shown on back of card) |
| recentGames | number? | Number of games played in last 40 completed games (shown on front of card) |
| benchWarmerStreak | number | Player's consecutive games in reserves |

## Usage

```tsx
import { PlayerCard } from '../components/player-card/PlayerCard';

<PlayerCard
  id="player-123"
  friendlyName="John Doe"
  xp={1000}
  rank={14} // Global rank from player_xp table
  caps={5}
  recentGames={4} // Games played in last 40 completed games
  benchWarmerStreak={3}
  // ... other props
/>
```

## Troubleshooting

### Rank Shield Not Displaying

If the rank shield is not appearing in certain views where PlayerCard is used, check the following:

1. **Database Connection**
   - Ensure the component is correctly fetching player data:
   ```typescript
   const { data: playerData } = await supabase
     .from('players')
     .select(`
       id,
       player_xp (
         xp,
         rank,
         rarity
       )
     `)
     .in('id', playerIds);
   ```

2. **Data Flow**
   - Verify playerStats is correctly set with rank data:
   ```typescript
   const stats = playerData?.reduce((acc, player) => ({
     ...acc,
     [player.id]: {
       rank: player.player_xp?.rank,
       // ... other stats
     }
   }), {});
   ```

3. **Component Props**
   - When mapping players to PlayerCard components, ensure rank is passed from playerStats:
   ```typescript
   players.map(player => (
     <PlayerCard
       {...player}
       rank={playerStats[player.id]?.rank}
       // ... other props
     />
   ))
   ```

4. **Common Issues**
   - Missing player_xp join in database query
   - Incorrect database schema access
   - Undefined playerStats for some players
   - Missing rank in player_xp table

5. **Verification**
   - Check that playerStats contains rank values from the database
   - Verify database queries include player_xp table
   - Confirm rank is being passed through component props
   - Use React DevTools to inspect PlayerCard props

## Related Components

- [WhatsAppIndicator](./WhatsAppIndicator.md)
- [Tooltip](./Tooltip.md)
- [RankShield](./RankShield.md)

## Styling

The component uses Tailwind CSS for styling and includes:
- Gradient backgrounds based on player rarity
- Responsive sizing
- Smooth animations for both card and indicators
- Consistent spacing and typography
- Proper z-index layering for overlaid elements
