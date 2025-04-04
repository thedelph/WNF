# Stats Page Responsive Design

## Overview
The Stats page (`/src/pages/Stats.tsx`) presents various player statistics in card formats, including winning streaks, attendance records, win rates, and XP leaderboards. This document details the responsive design implementation that ensures proper display on both mobile and desktop views.

## Responsive Design Strategy

### Mobile-First Approach
The Stats page implements a mobile-first approach with responsive breakpoints that adapt to larger screens:

- **Mobile View**: Elements stack vertically with optimized spacing and alignment
- **Desktop View**: Elements maintain fixed widths and horizontal alignment for tabular data presentation

### Key Components
The primary components with responsive layouts include:

1. **AwardCard**: Displays ranked player achievements (streaks, caps, etc.)
2. **StatsCard**: Shows statistical data (win rates, lucky bib color)
3. **HighestXPCard**: Presents the XP leaderboard with historical data

## Implementation Details

### Responsive Layout Classes
The responsive design relies on Tailwind CSS utility classes to handle different screen sizes:

- `flex-col sm:flex-row`: Stack vertically on mobile, horizontally on desktop
- `items-end sm:items-center`: Align text to end on mobile, center on desktop
- `w-full sm:w-auto`: Full width on mobile, auto width on desktop
- `justify-end`: Right-align content (especially important for numerical values)
- `whitespace-nowrap`: Prevent text wrapping that would break alignment
- `truncate`: Handle text overflow gracefully for long player names
- `gap-1 sm:gap-2`: Smaller gaps on mobile, larger on desktop
- `text-right`: Ensure proper text alignment

### Fixed Width Strategy
To maintain proper column alignment on desktop:

- XP values: `w-24`
- Win/streak counts: `w-20` 
- Percentages: `w-14`
- Dates: `w-24`

These fixed widths ensure that data aligns properly in columns on desktop, while stacking responsively on mobile.

### Sample Implementation

#### For Regular Stats with Dates (Streaks/Games)
```tsx
<div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
  <span className="font-bold text-right whitespace-nowrap w-20">{count} wins</span>
  <span className="text-xs opacity-80 text-right whitespace-nowrap w-24">{formattedDate}</span>
</div>
```

#### For Win Rates with W/D/L Stats
```tsx
<div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-4 flex-shrink-0 w-full sm:w-auto justify-end">
  <span className="font-bold whitespace-nowrap text-right w-14">{winRate}%</span>
  <span className="text-sm opacity-70 whitespace-nowrap text-right w-24">
    {wins}W/{draws}D/{losses}L
  </span>
</div>
```

#### For XP Leaderboard
```tsx
<div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
  <span className="font-bold whitespace-nowrap text-right w-24">{xp} XP</span>
  <span className="text-xs opacity-80 whitespace-nowrap text-right w-24">{date}</span>
</div>
```

## Troubleshooting Common Issues

### Mobile Alignment Problems
If statistics appear misaligned on mobile:
- Check that flex direction changes at the sm breakpoint: `flex-col sm:flex-row`
- Ensure text alignment is consistent: `text-right`
- Verify that all containers have `justify-end` for proper right alignment

### Desktop Alignment Issues
If columns don't align properly on desktop:
- Check that fixed width classes are consistently applied: `w-20`, `w-24`, etc.
- Ensure whitespace handling is correct with `whitespace-nowrap`
- Verify that `flex-shrink-0` is applied to prevent column squeezing

## Added April 2025
This responsive design implementation was added in April 2025 to address mobile view alignment issues, particularly in the "Longest Winning Streaks", "XP Leaderboard", and "Best Win Rates" cards, which previously had misaligned data on small screens.
