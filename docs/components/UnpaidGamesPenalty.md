# UnpaidGamesPenalty Component

A component that displays the XP penalty for players with unpaid games.

## Props

| Name | Type | Description |
|------|------|-------------|
| unpaidGames | number | The number of unpaid games for the player |
| penaltyPercentage | number | The penalty percentage per unpaid game (currently 30%) |

## Usage

```tsx
import UnpaidGamesPenalty from '../components/profile/UnpaidGamesPenalty';

// Inside your component:
<UnpaidGamesPenalty
  unpaidGames={2}
  penaltyPercentage={30}
/>
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

- Only displays if there are unpaid games (unpaidGames > 0)
- Penalty is calculated as penaltyPercentage * unpaidGames
- Games must be over 24 hours old to incur a penalty
- Reserve players are exempt from payment requirements
