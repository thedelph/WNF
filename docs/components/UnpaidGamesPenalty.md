# UnpaidGamesPenalty Component

A component that displays the XP penalty for players with unpaid games.

## Description

The `UnpaidGamesPenalty` component displays information about a player's unpaid games and their impact on XP. Each unpaid game older than 24 hours incurs a -50% XP penalty. These penalties stack linearly, meaning:

- 1 unpaid game = -50% XP
- 2 unpaid games = -100% XP
- 3 unpaid games = -150% XP

> **Note**: When penalties reduce XP below 0, the final XP value will be clamped to 0.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| unpaidGamesCount | number | Yes | Number of unpaid games older than 24 hours |
| showTooltip | boolean | No | Whether to show the tooltip explaining the penalty (default: true) |

## Usage

```tsx
import UnpaidGamesPenalty from '../components/profile/UnpaidGamesPenalty';

// Inside your component
<UnpaidGamesPenalty 
  unpaidGamesCount={2} 
  showTooltip={true}
/>
```

## Display Format

The component shows:
1. Number of unpaid games
2. Total XP penalty (-50% per game)
3. A tooltip explaining the penalty system when hovered

Example:
```
2 Unpaid Games (-100% XP)
```

## Features

- Displays the number of unpaid games
- Shows the total XP penalty percentage
- Includes a tooltip explaining the penalty system
- Uses red highlighting to emphasize unpaid games
- Animates on mount using Framer Motion
- Follows the WNF design system using Tailwind CSS and DaisyUI

## Dependencies

- React
- Framer Motion
- Tailwind CSS
- DaisyUI
- Radix UI (for tooltips)

## Notes

- Only displays if there are unpaid games (unpaidGamesCount > 0)
- Games must be over 24 hours old to incur a penalty
- Reserve players are exempt from payment requirements
