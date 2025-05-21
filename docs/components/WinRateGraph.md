# WinRateGraph Component

## Overview
The WinRateGraph component displays a player's win rate history over time as a responsive graph. It shows two key metrics:

1. **Overall Win Rate** - Cumulative win rate over all games played (blue line)
2. **Recent Win Rate** - 10-game moving average win rate (orange line) 

The graph also displays colored square indicators on the x-axis to show individual game outcomes:
- 🟩 **Green squares**: Wins
- 🟥 **Red squares**: Losses
- 🟪 **Purple squares**: Draws
- ⬜ **Grey squares**: Unknown/No outcome
- **Dashed border squares**: Games excluded from win rate calculation

The graph uses the Recharts library to create a fully responsive visualization that works well on both desktop and mobile devices.

## Visual Example
The component renders a combination chart with:
- X-axis: Sequential game numbers (1, 2, 3, etc.)
- Y-axis: Win rate percentage (0-100%)
- Color-coded squares on the x-axis indicating the outcome of each game
- Dashed-border squares for games excluded from the win rate calculation
- Enhanced tooltips showing detailed information for each data point including game number, date, outcome, win rates, and exclusion status

## Props

| Prop | Type | Description |
|------|------|-------------|
| `games` | `GameHistory[]` | Array of game history objects |
| `getGameOutcome` | `(game: GameHistory) => string \| null` | Function that determines win/loss/draw from a game |
| `className` | `string` (optional) | Additional CSS classes to apply to the component |

## Data Processing

The component processes game history to calculate:

1. **Cumulative Win Rate**: Total wins / total games played (only games with clear outcomes are counted)
2. **10-Game Moving Average**: Win rate over the last 10 games, calculated as (Wins / (Wins + Losses + Draws)) × 100
   - Draws ARE included in the denominator, consistent with the database win rate calculation
   - Only appears once the player has completed at least 10 games with valid outcomes (wins/losses/draws)
   - Uses exactly the same formula as the recent win rate shown on player profiles

## Responsive Behavior

- **Desktop**: Full-size graph with legend at the top
- **Mobile**: Legend moves to the bottom of the chart to prevent overlap with data
- **Automatic Adjustments**: Margins and spacing adapt based on screen size
- **Dynamic Resizing**: Component responds to window resize events in real-time

## Implementation Notes

- The x-axis shows sequential game numbers (1-based index) to provide a clear chronological view
- Games are represented by colored squares on the x-axis:
  - Green squares for wins
  - Red squares for losses
  - Purple squares for draws
  - Grey squares for games with unknown outcomes
  - Dashed border around squares for games excluded from win rate calculation
- Games are excluded from win rate calculations if they have:
  - Uneven teams (different number of players on each side)
  - Unknown outcomes
- Only games with even teams and clear win/loss/draw outcomes contribute to the win rate line
- The 10-game moving average (orange line) only appears after the player has at least 10 valid games with win/loss outcomes
- The component uses Framer Motion for smooth animations when loading
- Enhanced tooltips provide detailed information about specific games when hovering over data points, including why certain games are excluded from calculations
- Summary statistics below the graph show how many games are included/excluded from the win rate calculation
- The legend includes an example of an excluded game for clarity

## Usage

```tsx
import WinRateGraph from '../components/profile/WinRateGraph';
import { useGameHistory } from '../hooks/useGameHistory';

// In your component:
const { getGameOutcome } = useGameHistory();

// Then in JSX:
<WinRateGraph 
  games={games} 
  getGameOutcome={getGameOutcome} 
  className="w-full"
/>
```

## Technical Implementation

- Uses Recharts' `ComposedChart` to combine line charts (for win rates) with scatter plots (for game outcomes)
- Custom shape functions are used to render square markers for game outcomes and special dashed borders for excluded games
- Y-axis domain is precisely set to [0, 100] for the win rate percentage range
- Outcome indicators (squares) are positioned at y=2 to ensure visibility while maintaining a clean axis
- Responsive design logic detects screen size and adjusts layout accordingly
- Enhanced tooltip uses a custom component to display detailed game information including exclusion status and reasons
- Tracks statistics about included and excluded games to provide a summary below the chart

## Related Components

- [StatsGrid](./StatsGrid.md) - Shows static win rate data
- [GameHistoryTable](./GameHistoryTable.md) - Shows complete game history in tabular format
