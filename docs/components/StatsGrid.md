# StatsGrid Component

## Overview
The StatsGrid component displays various player statistics in a grid layout. It is used in both the Profile and PlayerProfile pages to show player information such as XP, streaks, win rates, and highest XP achievements.

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
```

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
