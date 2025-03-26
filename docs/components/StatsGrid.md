# StatsGrid Component

## Overview
The StatsGrid component displays various player statistics in a grid layout. It is used in both the Profile and PlayerProfile pages to show player information such as XP, streaks, win rates, caps (games played), and highest XP achievements.

## Features

### XP Display
- Shows the player's current XP
- Displays the player's rarity level based on their XP percentile
- Includes a tooltip with a description of what the rarity level means

### Highest XP Display
- Shows the player's highest ever XP value and the date it was achieved
- When the current XP equals the highest XP, displays "New Personal Best! 🎉" instead of showing the highest XP underneath
- Shows "No highest XP data" when no highest XP data is available

### Streak Display
- Shows the player's current streak
- Displays the player's maximum streak

### Win Rate Display
- Shows the player's overall win rate as the primary value
- Includes a form indicator showing the difference between recent and overall win rates (▲ for improvement, ▼ for decline)
- Displays the recent win rate (last 10 games) below in a smaller font
- Provides a tooltip that shows both values on hover

### Caps Display
- Shows the total number of games played by the player
- Includes a tooltip explaining that "Caps" represents the number of games played
- Formatted with thousands separators for better readability

## Implementation Details

### Highest XP Data
The highest XP data is fetched from the `highest_xp_records_view` in the database, which contains each player's highest XP value and the date it was achieved. This data is passed to the StatsGrid component as `highest_xp` and `highest_xp_date` properties.

```typescript
// Example of fetching highest XP data
const { data: highestXPData, error: highestXPError } = await executeWithRetry(
  () => supabase
    .from('highest_xp_records_view')
    .select('xp, snapshot_date')
    .eq('player_id', playerData.id)
    .single()
);

// Example of passing highest XP data to StatsGrid
<StatsGrid stats={{
  id: profile.id,
  friendly_name: profile.friendly_name,
  xp: profile.xp,
  // Other stats...
  highest_xp: profile.highestXP,
  highest_xp_date: profile.highestXPSnapshotDate ? new Date(profile.highestXPSnapshotDate).toLocaleDateString('en-GB') : undefined
}} />
```

### Caps Data
The caps data (number of games played) is fetched directly from the `players` table in the database. This data is passed to the StatsGrid component as the `caps` property.

```typescript
// Example of fetching player data including caps
const { data: playerData, error: playerError } = await executeWithRetry(
  () => supabase
    .from('players')
    .select(`
      id,
      user_id,
      friendly_name,
      avatar_svg,
      avatar_options,
      current_streak,
      max_streak,
      caps,
      whatsapp_group_member,
      player_xp (
        xp,
        rank,
        rarity
      )
    `)
    .eq('user_id', user?.id)
    .single()
);

// Example of passing caps data to StatsGrid
<StatsGrid stats={{
  id: profile.id,
  friendly_name: profile.friendly_name,
  xp: profile.xp,
  // Other stats...
  caps: profile.caps || 0
}} />
```

### Display Logic
The StatsGrid component uses conditional rendering to display the highest XP information:

```typescript
// Example of highest XP display logic
{stats.highest_xp ? (
  <>
    {stats.xp === stats.highest_xp ? (
      <div className="text-success font-semibold">
        New Personal Best! 🎉
      </div>
    ) : (
      <div className="text-sm opacity-80">
        Highest: {stats.highest_xp} XP
        {stats.highest_xp_date && (
          <span className="block text-xs opacity-70">
            {stats.highest_xp_date}
          </span>
        )}
      </div>
    )}
  </>
) : (
  <div className="text-sm opacity-60">
    No highest XP data
  </div>
)}

// Example of Caps display logic
{
  label: 'Caps',
  value: (
    <div className="flex flex-col items-center">
      <div className="text-lg font-semibold">
        {(stats.caps || 0).toLocaleString()}
      </div>
      <Tooltip content="Number of games played">
        <div className="text-xs opacity-70 cursor-help">
          Games Played
        </div>
      </Tooltip>
    </div>
  ),
}
```

The `toLocaleString()` method is used to format the number with thousands separators, making it more readable for users. A tooltip is also provided to explain that "Caps" represents the number of games played.

## Usage
The StatsGrid component is used in both the Profile and PlayerProfile pages:

- **Profile Page**: Displays the current user's statistics
- **PlayerProfile Page**: Displays another player's statistics when viewing their profile

## Recent Fixes

### Highest XP Display Discrepancy (March 24, 2025)
Fixed an issue where the highest XP data was not being displayed consistently between the Profile and PlayerProfile pages:

1. **Issue**: The Profile page was not fetching the highest XP data from the `highest_xp_records_view`, while the PlayerProfile page was correctly fetching and displaying it.

2. **Solution**: Updated the Profile page to fetch the highest XP data from the `highest_xp_records_view` and pass it to the StatsGrid component with the correct property names (`highest_xp` and `highest_xp_date`).

3. **Result**: Both the Profile and PlayerProfile pages now correctly display the player's highest XP value and the date it was achieved, as well as showing "New Personal Best! 🎉" when applicable.

### Caps Display Issue (March 26, 2025)
Fixed an issue where the "Caps" metric (games played) was not displaying correctly:

1. **Issue**: The "Caps" value was showing as 0 on the personal profile page and not displaying at all on the public profile page.

2. **Solution**: 
   - Updated the Profile page to include the `caps` field in the player data query and pass it to the StatsGrid component.
   - Updated the PlayerProfile page to pass the `caps` field to the StatsGrid component.

3. **Result**: Both the Profile and PlayerProfile pages now correctly display the player's total number of games played.

### XP Calculation Dependency on Latest Sequence (March 26, 2025)
Fixed an issue where the XP calculation in the StatsGrid component was inconsistent with the XPBreakdown component:

1. **Issue**: The StatsGrid component was displaying XP values that didn't match the XP breakdown because it wasn't considering the latest game sequence number.

2. **Solution**: Updated the Profile.tsx file to pass the `latestSequence` property to both the StatsGrid and XPBreakdown components, ensuring consistent XP calculation.

3. **Result**: The XP value displayed in the StatsGrid now correctly matches the total from the XPBreakdown component, providing users with consistent information across the profile page.

### Rarity Calculation Improvement (March 26, 2025)
Enhanced the rarity calculation to ensure accurate player ranking:

1. **Issue**: The rarity level displayed in the StatsGrid component was sometimes inconsistent or inaccurate because it relied on potentially outdated data.

2. **Solution**: Updated the Profile.tsx file to prioritize the rarity value from the most recent XP data fetch, with a fallback to player_xp data if available, and defaulting to 'Amateur' if no data is present.

3. **Result**: The rarity level now accurately reflects the player's current standing among all players, with proper tooltips explaining what each rarity level means (percentile ranking).

## Implementation Notes

### Rarity Calculation Logic
The rarity level is determined based on the player's XP percentile compared to all players:

```typescript
// Calculate rarity percentile based on player's XP compared to all players
const calculateRarity = (playerXP: number, allXP: number[]): number => {
  const totalPlayers = allXP.length;
  const playersBelow = allXP.filter(xp => xp < playerXP).length;
  return Math.round((playersBelow / totalPlayers) * 100);
};
```

The percentile is then mapped to a rarity level:
- Legendary: Top 2% (98th percentile)
- World Class: Top 7% (93rd percentile)
- Professional: Top 20% (80th percentile)
- Semi Pro: Top 40% (60th percentile)
- Amateur: Below 60th percentile

### XP Data Consistency
To ensure XP data consistency across components:

1. The latest sequence number must be passed to both the StatsGrid and XPBreakdown components:
   ```tsx
   <StatsGrid stats={{
     // Other stats...
     xp: profile.xp,
     highest_xp: profile.highestXP,
     highest_xp_date: profile.highestXPSnapshotDate || undefined,
     latestSequence: profile.latestSequence || 0
   }} />
   
   <XPBreakdown stats={{
     // Other stats...
     gameHistory: profile.gameSequences?.map((reg: any) => ({
       // Game history mapping...
     })),
     latestSequence: profile.latestSequence || 0
   }} />
   ```

2. The Profile page should fetch the latest sequence number during data loading:
   ```typescript
   // Fetch latest sequence number
   const { data: latestSeqData } = await supabase
     .from('games')
     .select('sequence_number')
     .eq('completed', true)
     .order('sequence_number', { ascending: false })
     .limit(1);
   
   const latestSequence = latestSeqData && latestSeqData.length > 0 
     ? latestSeqData[0].sequence_number 
     : 0;
   ```

This ensures that both components use the same data for calculations, providing a consistent user experience.
