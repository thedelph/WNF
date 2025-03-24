# Player Swap Preview Functionality

## Overview

The Player Swap Preview feature allows administrators to visualize the impact of swapping players between teams before committing to the change. This document explains how the preview system works, its components, and how to use it effectively.

## Key Components

### 1. Preview State Management

The preview system uses a state object in the `TeamBalancingOverview` component to track:

```typescript
const [previewState, setPreviewState] = useState<{
  player1: string | null;
  player2: string | null;
  active: boolean;
}>({
  player1: null,
  player2: null,
  active: false
});
```

- `player1`: ID of the first selected player
- `player2`: ID of the second selected player
- `active`: Whether a valid preview is currently active (both players selected from different teams)

### 2. Visual Feedback

Players selected for preview receive visual indicators:
- Purple border highlighting
- Button text changes to show current state
- Conditional buttons based on selection state

### 3. Preview Stats Calculation

When two players from different teams are selected, the system calculates the potential impact of the swap using the `calculateManualSwapStats` function, which:
- Computes new team compositions
- Calculates updated attack and defense ratings
- Determines the overall balance improvement score

## User Workflow

### Selecting Players for Preview

1. Click "Preview" on any player card
   - The player is marked as the first selection
   - Only a "Cancel" button is shown at this stage

2. Click "Preview" on a player from the opposite team
   - Both players are now highlighted
   - Preview stats appear showing the potential impact
   - Both "Cancel" and "Swap" buttons appear

### Managing Previews

- **Cancel Preview**: Clears the current preview state
- **Execute Swap**: Performs the swap and updates team assignments
- **Preview Multiple Options**: Cancel a preview to try different combinations

## Implementation Details

### TeamList Component

The `TeamList` component passes preview state to individual player cards:

```typescript
<PlayerCard
  player={player}
  isSelected={player.player_id === selectedPlayer}
  isTempSelected={previewState ? (previewState.player1 === player.player_id || 
                                 previewState.player2 === player.player_id) : false}
  showSwapButton={!!(previewState && previewState.player1 && 
                    previewState.player2 && previewState.active)}
  // ... other props
/>
```

### PlayerCard Component

The `PlayerCard` component renders different buttons based on the selection state:

- **When not selected**: "Select" and "Preview" buttons
- **When selected for formal selection**: "Cancel" button
- **When selected for preview**: "Cancel" button, and conditionally a "Swap" button

### Preview Stats Display

The preview stats are displayed with a distinct purple color scheme in the `TeamStats` component to differentiate them from the current team stats.

## Technical Considerations

1. **Performance**: Preview calculations happen client-side for immediate feedback
2. **Mobile Optimization**: All buttons are sized appropriately for touch interactions
3. **State Persistence**: Preview state remains until explicitly cancelled by the user

## Integration with Win Rate System

The preview functionality takes into account both overall and recent win rates (as described in the WinRateExplainer.md) when calculating the potential impact of player swaps, ensuring that form and consistency are factored into team balancing decisions.
