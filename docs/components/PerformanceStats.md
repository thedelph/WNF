# Performance Stats Component

## Overview
The PerformanceStats component is a container that displays performance-related statistics for WNF players. It organizes various award cards and statistical displays in a responsive grid layout, focusing on metrics that showcase player performance such as goal differentials, win streaks, and win rates.

## Features

### Core Features
- Displays a collection of performance-related statistics in a responsive layout
- Shows data for the selected year filter (or all-time)
- Displays current streaks only when viewing current year or all-time data
- Uses animation for a polished user experience

### Included Statistics
- **Team Goal Differentials**: Shows goal statistics with GF/GA ratio, ranked by efficiency (see [GoalDifferentialsCard](./GoalDifferentialsCard.md))
- **Longest Win Streaks**: Displays the longest win streaks achieved, with dates
- **Current Win Streaks**: Shows players with active win streaks (current year or all-time only)
- **Longest Unbeaten Streaks**: Displays the longest unbeaten streaks achieved, with dates
- **Current Unbeaten Streaks**: Shows players with active unbeaten streaks (current year or all-time only)
- **Best Win Rates**: Displays the top 10 players with the highest win percentages, with medal emojis for the top three

## Technical Implementation

### Layout
The component uses a responsive grid layout that adjusts based on screen size:
```tsx
<motion.div
  variants={containerVariants}
  initial="hidden"
  animate="visible"
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
>
  {/* Various stats cards */}
</motion.div>
```

### Conditional Rendering
Current streaks are only shown when viewing the current year or all-time data:
```tsx
{(selectedYear === 'all' || selectedYear === new Date().getFullYear()) && (
  <AwardCard
    title="Current Win Streaks"
    winners={stats.currentWinStreaks.map((player: PlayerStats) => ({
      name: player.friendlyName,
      value: (
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
          <span className="font-bold text-right whitespace-nowrap w-20">{player.currentWinStreak} wins</span>
        </div>
      ),
      rawValue: player.currentWinStreak,
      id: player.id
    }))}
    icon={<TrendingUp className="w-6 h-6" />}
    color="blue"
  />
)}
```

### Animation
Uses Framer Motion for smooth animations with staggered children:
```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};
```

## Integration
The PerformanceStats component is integrated into the Stats page and displayed in the "Performance" tab of the StatsTabs component.

## Recent Updates

### May 2025 Updates
1. **Enhanced Goal Differentials Card**: Updated to include GF/GA ratio and change sorting to prioritize this efficiency metric
2. **Improved Visual Consistency**: Ensured consistent styling across all award cards
3. **Enhanced Animation**: Improved animation timing for a smoother experience
4. **Updated Best Win Rates Card**: Replaced Lucide Medal icons with emoji medals and expanded to show top 10 players instead of only medal positions

## Component Dependencies
- **AwardCard**: Used for displaying ranked player achievements
- **StatsCard**: Used for displaying statistical values (see [StatsCard](./StatsCard.md))
- **GoalDifferentialsCard**: Custom card for displaying goal statistics
- **Framer Motion**: Used for animations
- **Emojis**: Used for medal indicators in win rate statistics
- **Lucide Icons**: Used for card icons
