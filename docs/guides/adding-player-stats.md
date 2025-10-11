# Adding New Player Stats/Modifiers Guide

This guide outlines the process of adding a new player statistic or modifier to player cards throughout the application. We'll use the "Registration Streak" feature as a case study.

## Component Hierarchy

When adding a new player stat/modifier, you need to update several interconnected components:

1. **Data Source**
   - Database view or table (e.g., `player_current_registration_streak_bonus`)
   - Contains the raw data for the stat/modifier

2. **Parent Components** (Need to fetch and pass data)
   - `TeamSelectionResults.tsx` - Shows teams after selection
   - `PlayerSelectionResults.tsx` - Shows selected/reserve/dropped players
   - `RegisteredPlayers.tsx` - Shows players before selection
   - `useGameRegistrationStats.ts` - Hook used by RegisteredPlayers
   - Any other components that render player cards

3. **Player Card Components**
   - `PlayerCard.tsx` (Main component that accepts props)
   - `PlayerCardModifiers.tsx` (Renders individual modifiers)
   - `PlayerCardTypes.ts` (Type definitions)

## Step-by-Step Process

### 1. Add Props to PlayerCard

Update the `PlayerCardProps` interface in `PlayerCard.tsx`:

```typescript
interface PlayerCardProps {
  // ... existing props
  registrationStreakBonus?: number;
  registrationStreakBonusApplies?: boolean;
}
```

### 2. Update Parent Components

Each parent component that renders player cards needs to:

a. **Fetch the Data**
```typescript
// Add to the supabase query
const { data: regStreakData, error: regStreakError } = await supabase
  .from('player_current_registration_streak_bonus')
  .select('friendly_name, current_streak_length, bonus_applies');

// Create a lookup map
const regStreakMap = regStreakData?.reduce((acc: any, player: any) => ({
  ...acc,
  [player.friendly_name]: {
    registrationStreak: player.current_streak_length || 0,
    registrationStreakApplies: player.bonus_applies || false
  }
}), {});
```

b. **Add to Player Stats**
```typescript
const stats = playerData?.reduce((acc, player) => ({
  ...acc,
  [player.id]: {
    // ... existing stats
    registrationStreakBonus: regStreakMap[player.friendly_name]?.registrationStreak || 0,
    registrationStreakBonusApplies: regStreakMap[player.friendly_name]?.registrationStreakApplies || false
  }
}), {});
```

c. **Pass Props to PlayerCard**
```typescript
<PlayerCard
  // ... existing props
  registrationStreakBonus={playerStats[player.id]?.registrationStreakBonus || 0}
  registrationStreakBonusApplies={playerStats[player.id]?.registrationStreakBonusApplies || false}
/>
```

### 3. Update PlayerCardModifiers

Add the rendering logic in `PlayerCardModifiers.tsx`:

```typescript
{registrationStreakBonusApplies && registrationStreakBonus > 0 && (
  <Tooltip content={registrationStreakBonus === 1 
    ? "Bonus for registering this week" 
    : `Bonus for registering ${registrationStreakBonus} weeks in a row`}>
    <motion.div 
      className="flex justify-between items-center bg-blue-500/20 rounded-lg p-2"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    >
      <div className="flex items-center gap-2">
        <PenLine className="w-4 h-4" />
        <span className="text-sm">Reg. Streak</span>
      </div>
      <span className="text-sm font-bold">+{(registrationStreakModifier * 100).toFixed(1)}%</span>
    </motion.div>
  </Tooltip>
)}
```

## Common Issues & Solutions

1. **Missing Data**
   - Check if the data is being fetched correctly from the database
   - Verify the query in the parent component
   - Check if the data mapping uses the correct key (e.g., `player.id` vs `player.friendly_name`)

2. **Props Not Passing Through**
   - Ensure all intermediate components pass the new props
   - Check prop types are correctly defined
   - Verify prop names match exactly between components

3. **Component Not Rendering**
   - Check conditional rendering logic
   - Verify data transformations
   - Look for type mismatches

## Testing New Stats/Modifiers

1. Add the stat/modifier to one parent component first (e.g., `RegisteredPlayers.tsx`)
2. Verify it works as expected
3. Replicate the implementation in other parent components
4. Test edge cases:
   - Zero values
   - Null/undefined values
   - Large numbers
   - Special characters in names/IDs

## Related Files

**Player Card Components:**
- `/src/components/player-card/PlayerCard.tsx`
- `/src/components/player-card/PlayerCardModifiers.tsx`
- `/src/components/player-card/PlayerCardFront.tsx`

**Parent Components (need data fetching and prop passing):**
- `/src/components/games/TeamSelectionResults.tsx` - Shows teams after selection
- `/src/components/games/PlayerSelectionResults.tsx` - Shows selected/reserve/dropped players
- `/src/components/game/RegisteredPlayers.tsx` - Shows players before selection
- `/src/hooks/useGameRegistrationStats.ts` - Shared hook for RegisteredPlayers and PlayerList

**Important Notes:**
- `useGameRegistrationStats.ts` is the canonical implementation for recent games data
- When adding game participation data, ensure array indices match: Index 0 = oldest game, Index 39 = most recent
- See `/docs/components/PlayerCard.md` for details on recent games implementation
